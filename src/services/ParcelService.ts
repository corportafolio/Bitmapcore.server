import { ParcelListingRepository, ParcelListing } from '../repositories/ParcelListingRepository';
import { PSBTService } from './PSBTService';
import { AssetProxyService } from './AssetProxyService';
import { ValidationError, NotFoundError, AppError } from '../errors/AppError';
import { isValidBitcoinAddress } from '../utils/bitcoinValidator';
import { logger } from '../utils/logger';

const PARCEL_MISMATCH_MESSAGE = 'Solo se aceptan parcelas cuyas 2 confirmaciones tengan la misma wallet que inscribio la parcela';

export class ParcelService {
  private listingRepo: ParcelListingRepository;
  private psbtService: PSBTService;
  private assetProxyService: AssetProxyService;

  constructor() {
    this.listingRepo = new ParcelListingRepository();
    this.psbtService = new PSBTService();
    this.assetProxyService = new AssetProxyService();
  }

  private async fetchBulkConfirmations(inscriptionIds: string[], walletAddress: string): Promise<Record<string, any>> {
    try {
      return await this.assetProxyService.getBulkParcelConfirmations(inscriptionIds, walletAddress);
    } catch (e: any) {
      logger.warn('Error fetching bulk parcel confirmations', { count: inscriptionIds.length, error: e?.message });
      throw new ValidationError('No se pudo verificar las confirmaciones de las parcelas');
    }
  }

  private validateParcelEligible(confResult: any): void {
    const confirmations = confResult && confResult.confirmations;
    const tx1 = confirmations && confirmations[0];
    const tx2 = confirmations && confirmations[1];

    if (!tx1 || !tx2) {
      throw new AppError('PARCEL_CONFIRMATIONS_MISMATCH', PARCEL_MISMATCH_MESSAGE, 422);
    }
    if (!(tx1.confirmed && tx2.confirmed)) {
      throw new AppError('PARCEL_CONFIRMATIONS_MISMATCH', PARCEL_MISMATCH_MESSAGE, 422);
    }

    const inscriber = tx1.inscriberWallet;
    if (!inscriber) {
      throw new AppError('PARCEL_CONFIRMATIONS_MISMATCH', PARCEL_MISMATCH_MESSAGE, 422);
    }

    const froms = String(tx2.selfTransferFrom || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s !== '');
    const tos = String(tx2.selfTransferTo || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s !== '');

    if (froms.indexOf(inscriber) === -1 || tos.indexOf(inscriber) === -1) {
      throw new AppError('PARCEL_CONFIRMATIONS_MISMATCH', PARCEL_MISMATCH_MESSAGE, 422);
    }

    const b1 = tx1.genesisHeight;
    const b2 = tx2.selfTransferHeight;
    if (b1 === undefined || b1 === null || b2 === undefined || b2 === null) {
      throw new AppError('PARCEL_CONFIRMATIONS_MISMATCH', PARCEL_MISMATCH_MESSAGE, 422);
    }
    if (Math.abs(Number(b1) - Number(b2)) > 10) {
      throw new AppError('PARCEL_CONFIRMATIONS_MISMATCH', PARCEL_MISMATCH_MESSAGE, 422);
    }
  }

  async createBatchListing(items: Array<{
    inscriptionId: string;
    price: number;
    sellerAddress: string;
    sellerOrdinalPublicKey: string;
    sellerPaymentAddress: string;
    name: string;
    imageUrl: string;
    parcelId: string;
    inscriptionNumber: number;
    inscriptionUtxo: string;
    inscriptionValue: number;
    inscriptionContentType: string;
    inscriptionHeight: number;
    isPriceUpdate: boolean;
  }>): Promise<{ listingIds: string[]; psbtToSign: string; psbtToSigns: Array<{ listingId: string; unsignedPsbtHex: string }> }> {
    logger.info('Creating parcel batch listing', { count: items.length });

    const listingIds: string[] = [];
    const psbtInputs: Array<{
      txid: string;
      vout: number;
      value: number;
      tapInternalKey: Buffer;
      sellerOrdinalAddress: string;
      sellerPaymentAddress: string;
      price: number;
    }> = [];

    const sellerAddress = items.length > 0 ? items[0].sellerAddress : '';
    const confirmationsMap = await this.fetchBulkConfirmations(items.map(i => i.inscriptionId), sellerAddress);

    for (const item of items) {
      if (!isValidBitcoinAddress(item.sellerAddress)) {
        throw new ValidationError('Invalid seller Bitcoin address');
      }
      if (!isValidBitcoinAddress(item.sellerPaymentAddress)) {
        throw new ValidationError('Invalid seller payment address');
      }

      this.validateParcelEligible(confirmationsMap[item.inscriptionId]);

      const confResult = confirmationsMap[item.inscriptionId];
      const confArr = confResult && confResult.confirmations;
      const confInfo = {
        inscriberWallet: confArr && confArr[0] ? confArr[0].inscriberWallet : undefined,
        genesisHeight: confArr && confArr[0] ? confArr[0].genesisHeight : undefined,
        tx1Txid: confArr && confArr[0] ? confArr[0].txid : undefined,
        selfTransferFrom: confArr && confArr[1] ? confArr[1].selfTransferFrom : undefined,
        selfTransferTo: confArr && confArr[1] ? confArr[1].selfTransferTo : undefined,
        selfTransferHeight: confArr && confArr[1] ? confArr[1].selfTransferHeight : undefined,
        tx2Txid: confArr && confArr[1] ? confArr[1].txid : undefined,
      };

      const parts = item.inscriptionUtxo.split(':');
      const inscriptionUtxo = {
        txid: parts[0] || '',
        vout: parseInt(parts[1] || '0', 10),
        value: item.inscriptionValue,
      };

      const existing = this.listingRepo.findByInscriptionId(item.inscriptionId);

      let listing: ParcelListing;

      if (item.isPriceUpdate && existing) {
        if (!existing.isActive) {
          throw new ValidationError('El listing de la parcela no esta activo');
        }
        if (existing.sellerAddress !== item.sellerAddress) {
          throw new ValidationError('No eres el vendedor de esta parcela');
        }
        if (!existing.sellerOrdinalPublicKey || !existing.sellerPaymentAddress) {
          throw new ValidationError('Listing de parcela sin datos PSBT');
        }

        this.listingRepo.updatePsbtFields(existing.id, {
          price: item.price,
          listedAt: Date.now(),
          psbtStatus: 'pending',
          signedPsbt: '',
        });

        listing = this.listingRepo.findById(existing.id)!;
      } else {
        if (existing && existing.isActive) {
          throw new ValidationError('La parcela ya esta listada para la venta');
        }

        if (existing && !existing.isActive) {
          this.listingRepo.updatePsbtFields(existing.id, {
            price: item.price,
            listedAt: Date.now(),
            psbtStatus: 'pending',
            isActive: false,
            signedPsbt: '',
          });
          listing = this.listingRepo.findById(existing.id)!;
        } else {
          listing = this.listingRepo.create({
            inscriptionId: item.inscriptionId,
            parcelId: item.parcelId || item.inscriptionId,
            name: item.name,
            price: item.price,
            sellerAddress: item.sellerAddress,
            sellerPaymentAddress: item.sellerPaymentAddress,
            sellerOrdinalPublicKey: item.sellerOrdinalPublicKey,
            inscriptionUtxo: item.inscriptionUtxo,
            inscriptionValue: item.inscriptionValue,
            inscriptionNumber: item.inscriptionNumber,
          });
        }
      }

      listingIds.push(listing.id);
      this.listingRepo.updateConfirmations(listing.id, confInfo);
      psbtInputs.push({
        txid: inscriptionUtxo.txid,
        vout: inscriptionUtxo.vout,
        value: inscriptionUtxo.value,
        tapInternalKey: this.psbtService.pubkeyToXOnly(item.sellerOrdinalPublicKey),
        sellerOrdinalAddress: item.sellerAddress,
        sellerPaymentAddress: item.sellerPaymentAddress,
        price: item.price,
      });
    }

    const combinedPsbt = await this.psbtService.createBatchListingPSBT(psbtInputs);
    const separatePsbtHexs = this.psbtService.createSeparateListingPSBTs(psbtInputs);

    const psbtToSigns: Array<{ listingId: string; unsignedPsbtHex: string }> = [];
    for (let i = 0; i < listingIds.length; i++) {
      const id = listingIds[i];
      this.listingRepo.updatePsbtFields(id, {
        unsignedPsbt: separatePsbtHexs[i],
        psbtStatus: 'pending',
      });
      psbtToSigns.push({ listingId: id, unsignedPsbtHex: separatePsbtHexs[i] });
    }

    return {
      listingIds,
      psbtToSign: combinedPsbt.unsignedPsbt,
      psbtToSigns,
    };
  }

  async signBatchListings(listingIds: string[], signedPsbtHexs: string[], sellerOrdinalPublicKey: string): Promise<ParcelListing[]> {
    logger.info('Signing parcel batch listings', { count: listingIds.length, signedCount: signedPsbtHexs.length });

    const isCombined = signedPsbtHexs.length === 1 && listingIds.length > 1;

    if (!isCombined && listingIds.length !== signedPsbtHexs.length) {
      throw new ValidationError(`Se recibieron ${signedPsbtHexs.length} firmas para ${listingIds.length} parcelas. Todas deben firmarse para activar el listado.`);
    }

    if (isCombined) {
      const sigCheck = this.psbtService.validateSignaturePresence(signedPsbtHexs[0], listingIds.length);
      if (!sigCheck.valid) {
        throw new ValidationError(`PSBT combinado: ${sigCheck.details}`);
      }
    }

    const results: ParcelListing[] = [];

    for (let i = 0; i < listingIds.length; i++) {
      const listingId = listingIds[i];
      const signedPsbtHex = isCombined ? signedPsbtHexs[0] : signedPsbtHexs[i];

      const listing = this.listingRepo.findById(listingId);
      if (!listing) {
        throw new ValidationError(`Listing de parcela no encontrado: ${listingId}`);
      }
      if (listing.psbtStatus !== 'pending') {
        throw new ValidationError(`El listing no esta en estado 'pending': ${listing.psbtStatus}`);
      }
      if (listing.sellerOrdinalPublicKey !== sellerOrdinalPublicKey) {
        throw new ValidationError('La clave publica no coincide con el listing');
      }

      const isValid = this.psbtService.validateSignedListingPSBT(signedPsbtHex, listing.sellerPaymentAddress, listing.price);
      if (!isValid) {
        throw new ValidationError(`Firma invalida para la parcela ${listing.name}`);
      }

      this.listingRepo.setSigned(listingId, signedPsbtHex);
      results.push(this.listingRepo.findById(listingId)!);
    }

    return results;
  }

  async updateListingPrice(id: string, newPrice: number, walletAddress: string, clientUtxo: string, clientValue: number): Promise<{ unsignedPsbt: string; listing: ParcelListing }> {
    const listing = this.listingRepo.findById(id);
    if (!listing) {
      throw new NotFoundError('Listing de parcela no encontrado');
    }
    if (listing.sellerAddress !== walletAddress) {
      throw new ValidationError('No eres el vendedor de esta parcela');
    }
    if (!listing.isActive) {
      throw new ValidationError('El listing de la parcela no esta activo');
    }
    if (newPrice <= 0) {
      throw new ValidationError('El precio debe ser mayor que 0');
    }
    if (!listing.sellerOrdinalPublicKey || !listing.sellerPaymentAddress) {
      throw new ValidationError('Listing de parcela sin datos PSBT');
    }

    const psbtResult = await this.psbtService.createPriceUpdatePSBT(
      listing.inscriptionId,
      listing.sellerPaymentAddress,
      newPrice,
      listing.sellerOrdinalPublicKey,
      clientUtxo || listing.inscriptionUtxo,
      clientValue || listing.inscriptionValue
    );

    this.listingRepo.updatePsbtFields(id, {
      unsignedPsbt: psbtResult.unsignedPsbt,
      psbtStatus: 'pending',
      price: newPrice,
      listedAt: Date.now(),
      isActive: false,
    });

    const updatedListing = this.listingRepo.findById(id)!;
    return { unsignedPsbt: psbtResult.unsignedPsbt, listing: updatedListing };
  }

  async signPriceUpdate(id: string, signedPsbt: string, sellerOrdinalPublicKey: string, newPrice: number): Promise<ParcelListing> {
    const listing = this.listingRepo.findById(id);
    if (!listing) {
      throw new NotFoundError('Listing de parcela no encontrado');
    }
    if (listing.psbtStatus !== 'pending') {
      throw new ValidationError(`El listing no esta en estado 'pending': ${listing.psbtStatus}`);
    }
    if (listing.sellerOrdinalPublicKey !== sellerOrdinalPublicKey) {
      throw new ValidationError('La clave publica no coincide con el listing');
    }
    if (newPrice <= 0) {
      throw new ValidationError('El precio debe ser mayor que 0');
    }

    const isValid = this.psbtService.validateSignedListingPSBT(signedPsbt, listing.sellerPaymentAddress, newPrice);
    if (!isValid) {
      throw new ValidationError(`Firma invalida para la parcela ${listing.name}`);
    }

    this.listingRepo.updatePsbtFields(id, {
      signedPsbt,
      psbtStatus: 'signed',
      price: newPrice,
      listedAt: Date.now(),
      isActive: true,
    });

    return this.listingRepo.findById(id)!;
  }

  async delist(id: string, walletAddress: string): Promise<void> {
    const listing = this.listingRepo.findById(id);
    if (!listing) {
      throw new NotFoundError('Listing de parcela no encontrado');
    }
    if (listing.sellerAddress !== walletAddress) {
      throw new ValidationError('No eres el vendedor de esta parcela');
    }
    this.listingRepo.delist(id);
  }
}
