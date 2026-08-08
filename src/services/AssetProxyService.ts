import axios from 'axios';
import { logger } from '../utils/logger';
import { AssetInscription, AssetCollection, UserAssetsResponse } from '../types/asset';
import { ExternalApiError } from '../errors/AppError';

const BITTICK_AGENT_IDS = new Set([
  "ef7563ebd206be7271685774b39eec7c188ff57f763e08b31e84732848c8101bi0",
  "633d5ed3dd194f7a185ca30a509974a1933a0e84db989298c1ee092ac810db36i0",
  "d5f21c0c8a4661f596f740203aeb934eee72f155277189dab5797b0864c6439fi0",
  "6591e7240a5bb191055dc8e0ae4d81f7e4f933b85d6dc89c7904f9e45a513674i0",
  "c31c1d04b68171b5405aea66f62111efd3a1c47cfbfcae8253146e448905fc50i0",
  "09fef6597c5206b97372cedace97364f078b61ef468a0c2ef6b11e82df0995aci0",
  "ac7196dff767bfc870213adb557169984bc0c749452089cbceb1d5b6e395d95ci0",
  "3e405acb3d046a38e8c31c99ccbee3b12221f3747fc0c5e3601997937a311b8ai0",
  "243f265f151bd3a68a96976bd51e9da5027ad5e3908e6d5fcbd6b4ec06e2ef59i0",
  "6355c18aa385c2d53c04e393a4ce0898f2add7aa99f9e0d03d299879b0fdb01ai0",
  "7a43b6c2c2129871bed2e1b34c766906ac407b0290c8d80353e2af19d7224d34i0",
  "689556d4a1cabce4b4aed38dd92297300103d0e3232661a30c768b8e665a82e3i0",
  "d0d9ff1321be18a87f26dbf559018a0a53b712a3aed2d5bfe185241d106b32eei0",
  "99a721de93233abf5d3422514ad558dbdc84188e24dcf7afbb44ef754c1722edi0",
  "503874ef280d937f5ca003605a6991051a4a99ab0a07aab683c2ecf8d57cd4e1i0",
  "e949b589cbda4717cbadf4038fe593d1c951a0ff63916311a024b11917fed419i0",
  "8ce536a14c2eee4a93d03c830aa120fcee2d5f393b112657b40605e2aefe02f9i0",
  "ad6aba6b6cd912efeff5c3d890c9add62df8f86fa9948e26ace64473ebe92687i0",
  "2528cc96797d94f23079801d467821895fd4dbf30271e034ce587336986c471bi0",
  "92ad1c5a101b00b0207c0739bd158aa71dbc8f80ce250838c5763c6b852ed26ei0",
  "882a355585c5a3551cba8f7fbf52c9c764e9e41de56f4c912e066052d651314ci0",
  "45bc3fbcfde94bde2f5fea8c0ab7eb953326170c06a26f69c6bd4dba419feb4fi0",
  "4afa6b39caabdc3129981eb82ec5983a52f7c8c706da9dbe2c7e81add4be9d28i0",
  "83e491550ea275cdb22a556012c6189157a420623353e95012432958f1a0fd99i0",
  "4590923d3eb6317681a873ec667efcacb48a99f6fdcaeb11e5f51db9c8c0add3i0",
  "b38cf13ad69cb4dfffefc9ee7702f3eb04ab3a4047446239b25a7eb3df81dd02i0",
  "29e140578f127cb5e76e1603702eab692e6426ab91548d267c62afa10806db59i0",
  "d61fa23afb425bdc7e761e16d5ef5800daa38131ac8740dDF5dc6bc01a6e437ei0",
  "8685bc7098b5b03444eb29816e0138afd1f6e0b1bcf55edf28f2d86b499245c0i0",
  "de76ff396640773c09cf939c18a8593837015c27ab351456c60f90cc8f6b746fi0",
  "970b65cb118744d71b5c7baf0d41c251b0adbf57460024fc363806a48734e030i0",
  "03dc94bc49890281e6973d40dc526b966aca5f117d036b700956c3c5803d2c32i0",
  "f1c0f119ebcae98b06bb91604ac17d0adf1824f20518414da15f8c6af5d96bf9i0",
  "7164b1b5ef5cf6587c6102f256a1a82b723d6c2e00cbafaf521aaf28bedaf491i0",
  "8bf00c12c9ca48e07f2485127520301bde95e28def39b6288b8554910b344a79i0",
  "24f12a8c2d483c75b74f8cf47d61f6621edc3aa8284cbfd08884c1630478f894i0",
  "3d79e9955f4f739f07279b94f0f5d813fa9589eb42e7813db4b296bdd64e0466i0",
  "bde1b401d0df88cac24f0aabebb2855919cbf93fa23ae6316803ff9d8d651472i0",
  "58fa453eac6cb88ae9d1a3ebeb294c73ba6b6cc5f0f7a1f5d342bc5aed429007i0",
  "f4f5c9808c47eb5b92acbf4ece213979373b7b4d951b1e99c2248819ce214162i0",
  "0d230d3f711e5e6512eefdcd019833ebd89de395a207449842b302ef3ac68199i0",
  "29b8b578b900d72bddb937b80ced4fae795d42588b94597a28367b30ba09d4abi0",
  "e4032d004467482bff46a8f9995d09e9bce52931a8099351390ab52cee4c9286i0",
  "b4d47c1a7906e0168eaa2d2088c890417c903952e908fd3d566fe5c6e0e0d27ai0",
  "f75cdac629b0f2e5fe31e76b485b8f427cc52b3939742fe0c891ea7a87c9118ci0",
  "811cf5935aafb2cb3a81e412253c1a3ae52c4ac5269b9aef16315567665ea8c4i0",
  "73be123b182f095d738fc9ea9bbb55331c3fb27558eaac855ebba2140eecc32fi0",
  "9c21c9ec6b20da1574bb470fb601e63d14c4acecf4b208d028dde89a702c8e7bi0",
  "45e534be0461754ea6ac5394bf2389d95514892c98e034d4c3611932bbfc2a0ei0",
  "228127f9a2dfc8f87f5f85de5ba76507d88a77fe660da9422b3c3686441b85fai0",
  "58b7f728f29472ac2635b2070d615c2f30fff6f2caac403b177f7d82cc9a2084i0",
  "92ee4c09318d24c1924ac0bc734f6b1824ba9d481fb0061fa35a22838d792d72i0",
  "b456dda52ab58952ef8fc7423cce826cf67e31c5812b3add8f673f92a4a70db5i0",
  "2e87413c693d0005814d2b9ab20d84bc716634e0a54757c8ccc6742fe2fa12a4i0",
  "d8dfd0826795531a733eca924542a7204e8500ce0c014a5013b1194ca469b9eci0",
  "1902e998ad4824ecd998b75908e22a5da80f6bb3f1e517bae71739f3622b1883i0",
  "d934715b90b2356acb89d5574b3fd8748eb2d1124750ff8d043d869753a1d925i0",
  "da120821ffc8114e2483ba2574ef2dbf173f00b397406cf46f836590a9ef3ed9i0",
  "42e6c96d2f6b045a262c326e984edb490ee3b03d51414809229e080d58eca24di0",
  "916248ec5f0334630215047eebd77094dba472a10369f8d9e06d4ee3f101c294i0",
  "be91b3292201950307b40185f7c5df5a6fede80ab6878e5a13d7dc8d1f484611i0",
  "51dc78376d470000664a75a58cf774f8ce70a5d3d31c887c63237ec6b0148404i0",
  "abc8a24266f6541381b5f74c5311bfec2df9fa412e8ab2ccd9d6134de754afabi0",
  "90e860483e95379ad5165c74e53120afa3ba3bd5df1800ab5041552ec411a2b2i0",
  "826e15d51130ae4fb7a390e1271af9b3220f5958f375e8d4864ae06a619c06cci0",
  "548697fc005204bee88b4b4b39b30cfb4438d38013252788c82c8851ca544902i0",
  "8f9a0d6a161e196c64a2d6bb2b015b53a116e520e47fae281ff17abcc9a2e567i0",
  "dff07545e1bbf2a4a11513db8b4dc2f938da6fd0aceb2ab1954a3d4ff8861ef0i0",
  "f9ff2b82c9d6743e6179be42a1a5d77c0340c5d4d312dda61d2b8f5cebcc7959i0",
  "98b325df0c7245383834eebc9314dfb018281db8f7ca6401bbdf7704adbfab1bi0",
  "07d6d0fe550d6b7195ee9ff1d66d34fe610c29818e1ac5924ddb3a7cddc8847di0",
  "21bf7682abebb926d14d865b53155b5298858e63529916328001f70a8a4b5aa2i0",
  "f6eaccc9c7c7e5eae6961a081ec5a37f912bb6a031e927a7aef53ed917b40939i0",
  "7d0f975378fee222b997005cc546adc33631a507f0812af2445c85eb4aee2301i0",
  "0600991281043e1951a4642887c7daabd18282ff210be85af44bd73f9dc89c18i0",
  "54a6c8dccc3734e981dc66f67cab5786e2f97d5727b426ffc2060dac43a7019bi0",
  "72ae20bb1a21652c1b49abe7fabd29769b65c6002732507e388c4ee2d6ced58di0",
  "17619ba73f46f3eaeaa1d9aa4036d46347f179f9cc4db1d3f4018f8130d1a3f6i0",
  "c65696cb378166ddba3901e28225e2167120b778996cf609ad020b1a63ebc97ci0",
  "3bbc43a3186c35bb9cbca634221a8e767ffa249646755abbdb200e24fd0c9eeci0",
  "98a40d5658e1a009c9cc64493c3c10a0cbe714e272fabf2f114e92e3ffb86a86i0",
  "ed166c31250b880ed7957232688f92fbc313a247f45afdcae78e530e8e7fbd77i0",
  "a10a315d13052a44a5511b725e44b59a2dd75693b74ff36acc81eb1fdd4819e0i0",
  "9bd41055cf8489da3848903d62a2ea6f8cae0ae1736fb94f70c5a8175625079fi0",
  "ddfa1e890b022a8c088d4ad9d92e9b002a247218f48d49c4a0173c5f8f8a3dedi0",
  "effc0cbe946622a7f43c52f88b1680d8b7efebeca906323134e474e140399489i0",
  "02e874b14d3b01612f304f3a8c82fa0a7e7c347430acc26968598f4ad3697ba5i0",
  "58f098377551bc9312f52993b3480a52dc09fd20635fcfbf821d98e6920b97a2i0",
  "7dc12cfc856487f1f768d818f593acf978c7d42884c1e4d50ea688bb0c2b4c5bi0",
  "e29a0e7861a5847deced7e46237806f87313ad8cb1cc35a57f4b278afcd48e50i0",
  "8c7878a7948c521ac9c96059cf787166fa0c8716328911d40695563960e0b24fi0",
  "fd39f74305ac3fa60ac9ac6bbdf42bacbd3173cd6827b3c0aef33a1c35693b9ai0",
  "c87516288ae373f6501566f6a4d793545fe2f401c309a89addda2702ea023f7di0",
  "65e789b74592b7038d23fa9028df406351e220116626766bb772f168ff6cfadci0",
  "8000b1bfd89d19193bc314cc66ee1640e792783c9746cb0c322daa7724e837cfi0",
  "535f16e0087d402fe71aad1f25e91ba11551f4a189472031968db98cdf558ef5i0",
  "fb14e1da5c10ce2fd9e7f8502c49ab14d7511da533f4b18b3eb64e2b448b72c4i0",
  "4bf11b2cd10f5dbdc8437515892ad51ca9b244f2e95b59986e9ad6dbd331d0eai0",
  "b7ab4397fdc8237864ed2508e9f1046b59e1c222a76a93bf3a1469070c731465i0",
  "3bd41b37d01392366ab5968e0b79db5b8ca59bbb90d6f0fbb417d32c720b0cc4i0",
]);

const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';
const PARCEL_REGEX = /^\s*(\d+)\.(\d+)\.bitmap\s*$/i;
const FULL_BLOCK_REGEX = /^\s*(\d+)\.bitmap\s*$/i;

function limitConcurrency<T>(items: T[], concurrency: number, fn: (item: T) => Promise<any>): Promise<any[]> {
  const results: any[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await fn(items[i]);
      } catch (e: any) {
        results[i] = null;
      }
    }
  }

  return Promise.all(Array(Math.min(concurrency, items.length)).fill(null).map(() => worker())).then(() => results);
}

export class AssetProxyService {
  private baseUrl = 'https://ordinals.com';

  async getUserAssets(address: string): Promise<UserAssetsResponse> {
    logger.info('Fetching user assets', { address });

    const outputIds = await this.fetchOutputIds(address);
    logger.info(`Found ${outputIds.length} outputs`, { address });

    const inscriptionIds: string[] = [];
    const outputBatcher = await limitConcurrency(outputIds, 10, async (outputId: string) => {
      const ids = await this.fetchInscriptionIdsFromOutput(outputId);
      logger.debug(`Output ${outputId}: ${ids.length} inscriptions`);
      return ids;
    });
    for (const batch of outputBatcher) {
      if (batch) inscriptionIds.push(...batch);
    }
    logger.info(`Found ${inscriptionIds.length} inscriptions total`, { address });

    const inscriptions = await this.processInscriptions(inscriptionIds, address);
    logger.info(`Processed ${inscriptions.length} inscriptions`, { address });

    const collections = this.groupByCollection(inscriptions);
    return {
      address,
      collections,
      total: inscriptions.length
    };
  }

  private inscribedCache = new Map<string, { ts: number; set: Set<string> }>();

  async getInscribedOutputIds(address: string, utxos: Array<{ txid: string; vout: number }>): Promise<Set<string>> {
    const cacheKey = address.toLowerCase();
    const cached = this.inscribedCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 60000) {
      logger.info('Inscribed outputs cache hit', { address, count: cached.set.size });
      return cached.set;
    }

    const outputIds = utxos.map(u => `${u.txid}:${u.vout}`);
    const results = await limitConcurrency(outputIds, 10, async (outputId: string) => {
      const ids = await this.fetchInscriptionIdsFromOutputStrict(outputId);
      return { outputId, hasInscriptions: ids.length > 0 };
    });

    const inscribed = new Set<string>();
    let failures = 0;
    for (const r of results) {
      if (!r) { failures++; continue; }
      if (r.hasInscriptions) inscribed.add(r.outputId.toLowerCase());
    }

    if (failures > 0) {
      logger.error('Inscribed outputs verification failed', { address, failures, total: outputIds.length });
      throw new ExternalApiError(`No se pudo verificar el saldo disponible (${failures} outputs sin verificar). Intente de nuevo.`);
    }

    this.inscribedCache.set(cacheKey, { ts: Date.now(), set: inscribed });
    logger.info('Inscribed outputs verified per-UTXO', { address, total: outputIds.length, inscribed: inscribed.size });
    return inscribed;
  }

  private async fetchOutputIds(address: string): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/address/${address}`, {
        timeout: 15000,
        headers: { 'User-Agent': UA, 'Accept': 'text/html' }
      });
      const html = typeof response.data === 'string' ? response.data : '';
      const regex = /href=["']?\/output\/([^ "'>]+)/g;
      const ids: string[] = [];
      let match;
      while ((match = regex.exec(html)) !== null) {
        ids.push(match[1]);
      }
      return [...new Set(ids)];
    } catch (error: any) {
      logger.error('Failed to fetch address page', { address, error: error.message });
      return [];
    }
  }

  private async fetchInscriptionIdsFromOutput(outputId: string): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/output/${outputId}`, {
        timeout: 15000,
        headers: { 'User-Agent': UA, 'Accept': 'text/html' }
      });
      const html = typeof response.data === 'string' ? response.data : '';
      const regex = /\/inscription\/([a-f0-9]{64}i\d+)/g;
      const ids: string[] = [];
      let match;
      while ((match = regex.exec(html)) !== null) {
        ids.push(match[1]);
      }
      return [...new Set(ids)];
    } catch (error: any) {
      logger.error('Failed to fetch output page', { outputId, error: error.message });
      return [];
    }
  }

  private async fetchInscriptionIdsFromOutputStrict(outputId: string): Promise<string[]> {
    const response = await axios.get(`${this.baseUrl}/output/${outputId}`, {
      timeout: 15000,
      headers: { 'User-Agent': UA, 'Accept': 'text/html' }
    });
    const html = typeof response.data === 'string' ? response.data : '';
    const regex = /\/inscription\/([a-f0-9]{64}i\d+)/g;
    const ids: string[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      ids.push(match[1]);
    }
    return [...new Set(ids)];
  }

  private async processInscriptions(inscriptionIds: string[], address: string): Promise<AssetInscription[]> {
    const results = await limitConcurrency(inscriptionIds, 10, async (id: string) => {
      return this.processSingleInscription(id, address);
    });
    return results.filter((r): r is AssetInscription => r !== null);
  }

  private async processSingleInscription(id: string, address: string): Promise<AssetInscription | null> {
    try {
      const [detailResponse, contentResponse] = await Promise.all([
        axios.get(`${this.baseUrl}/r/inscription/${id}`, {
          timeout: 15000,
          headers: { 'User-Agent': UA }
        }).then(r => r.data).catch(() => null),
        axios.get(`${this.baseUrl}/content/${id}`, {
          timeout: 15000,
          headers: { 'User-Agent': UA },
          responseType: 'text',
          transformResponse: [(data: any) => data]
        }).then(r => ({
          body: typeof r.data === 'string' ? r.data : '',
          contentType: r.headers['content-type'] || ''
        })).catch(() => ({ body: '', contentType: '' }))
      ]);

      const inscriptionNumber = detailResponse?.number ?? 0;
      const metaprotocol = detailResponse?.metaprotocol ?? null;
      const contentType: string | null = (contentResponse.contentType as string) || null;
      const body = contentResponse.body;
      const output: string | null = detailResponse?.output ?? null;
      const value: number | null = detailResponse?.value ?? null;
      const height: number | null = detailResponse?.height ?? null;

      return this.identifyCollection(id, address, contentType, metaprotocol, body || null, inscriptionNumber, output, value, height);
    } catch (error: any) {
      logger.error('Failed to process inscription', { id, error: error.message });
      return null;
    }
  }

  private identifyCollection(
    id: string,
    address: string,
    contentType: string | null,
    metaprotocol: string | null,
    content: string | null,
    inscriptionNumber: number,
    output: string | null,
    value: number | null,
    height: number | null
  ): AssetInscription {
    let protocol: string | null = null;
    let tick: string | null = null;
    let isBitmap = false;
    let isParcel = false;
    let isBittickAgent = false;
    let collectionName: string | null = null;
    let displayName: string | null = null;
    let imageInscriptionId: string | null = null;

    if (content) {
      const trimmed = content.trim();

      const parcelMatch = trimmed.match(PARCEL_REGEX);
      if (parcelMatch) {
        isBitmap = true;
        isParcel = true;
        collectionName = 'Parcelas';
        displayName = trimmed;
      } else {
        const fullBlockMatch = trimmed.match(FULL_BLOCK_REGEX);
        if (fullBlockMatch) {
          isBitmap = true;
          collectionName = 'Bitmaps';
          displayName = trimmed;
        }
      }

      if (!isBitmap && trimmed.startsWith('{')) {
        try {
          const json = JSON.parse(trimmed);
          const p = json.p;
          if (p) {
            protocol = p;
            tick = json.tick ?? null;
            if (tick) {
              collectionName = tick.toUpperCase().trim();
            }
            if (p.toLowerCase() === 'tap') {
              const dep = json.dep;
              if (dep) {
                imageInscriptionId = dep;
              }
            }
          }
        } catch (_) {}
      }
    }

    if (collectionName === null && metaprotocol) {
      const mp = metaprotocol.toLowerCase();
      if (mp === 'brc-20') protocol = 'brc-20';
      else if (mp === 'tap') protocol = 'tap';
    }

    if (collectionName === null) {
      if (contentType?.startsWith('image/')) {
        collectionName = 'Images Ordinals';
      } else if (contentType?.startsWith('text/')) {
        collectionName = 'Text';
      } else if (contentType?.includes('json')) {
        collectionName = 'JSON';
      } else {
        collectionName = 'Other';
      }
    }

    isBittickAgent = BITTICK_AGENT_IDS.has(id);
    if (isBittickAgent) {
      collectionName = 'Bittick Agents';
    }

    const finalName = displayName ?? `${collectionName} #${inscriptionNumber}`;

    return {
      id,
      address,
      name: finalName,
      metaprotocol,
      contentType,
      height,
      isBitmap,
      collectionName,
      protocol,
      tick,
      inscriptionNumber,
      isParcel,
      isBittickAgent,
      imageInscriptionId,
      imageContentType: null,
      output,
      value
    };
  }

  private groupByCollection(inscriptions: AssetInscription[]): AssetCollection[] {
    const collectionOrder = ['Bitmaps', 'Parcelas', 'Bittick Agents'];
    const groups = new Map<string, AssetInscription[]>();

    for (const ins of inscriptions) {
      const colName = ins.collectionName || 'Other';
      if (!groups.has(colName)) {
        groups.set(colName, []);
      }
      groups.get(colName)!.push(ins);
    }

    for (const [, items] of groups) {
      items.sort((a, b) => b.inscriptionNumber - a.inscriptionNumber);
    }

    const orderedCollections: AssetCollection[] = [];

    for (const name of collectionOrder) {
      const items = groups.get(name);
      if (items && items.length > 0) {
        orderedCollections.push({ name, count: items.length, items });
        groups.delete(name);
      }
    }

    const remaining = Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));
    for (const [name, items] of remaining) {
      orderedCollections.push({ name, count: items.length, items });
    }

    return orderedCollections;
  }
}
