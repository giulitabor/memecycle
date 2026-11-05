/**
 * Build durable external pointers for the research dossier.
 * No dataset rows, media or metadata payloads are downloaded or mirrored here.
 */
const DATASET = "loopholetape/pumpfun-launches";
const DATASET_URL = "https://huggingface.co/datasets/loopholetape/pumpfun-launches";
const DATASET_CONFIGS = ["launches", "launches_legacy", "graduation_pools", "features"];

function filterUrl(mint, config) {
  const url = new URL("https://datasets-server.huggingface.co/filter");
  url.searchParams.set("dataset", DATASET);
  url.searchParams.set("config", config);
  url.searchParams.set("split", "train");
  url.searchParams.set("where", `"mint"='${mint}'`);
  url.searchParams.set("length", "1");
  return url.toString();
}

function safeUri(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const uri = value.trim();
  if (/^(https?:\/\/|ipfs:\/\/|ar:\/\/)/i.test(uri)) return uri;
  return null;
}

export function buildArchiveReferences({ mint, primaryPairAddress = null, metadataUri = null, launchSignature = null }) {
  const datasetReferences = DATASET_CONFIGS.map((config) => ({
    provider: "Hugging Face Dataset Viewer",
    dataset: DATASET,
    dataset_url: DATASET_URL,
    dataset_config: config,
    split: "train",
    licence: "CC BY 4.0",
    attribution: 'loopholetape, "pump.fun launches with outcomes" (2026)',
    lookup_url: filterUrl(mint, config),
    locator_type: "exact mint filter; query returns a row index when a matching row exists",
    retrieval_status: "reference_only_not_fetched",
    source_claims_are_not_verdicts: true
  }));

  return {
    subject: {
      network: "solana-mainnet",
      mint,
      explorer_url: `https://explorer.solana.com/address/${encodeURIComponent(mint)}`
    },
    external_archives: datasetReferences,
    market_references: {
      dexscreener_token_url: `https://dexscreener.com/solana/${encodeURIComponent(mint)}`,
      primary_pair_address: primaryPairAddress,
      primary_pair_url: primaryPairAddress
        ? `https://dexscreener.com/solana/${encodeURIComponent(primaryPairAddress)}`
        : null
    },
    metadata_reference: {
      uri: safeUri(metadataUri),
      retrieval_status: safeUri(metadataUri) ? "not_fetched" : "not_available"
    },
    launch_transaction_reference: launchSignature
      ? {
          signature: launchSignature,
          explorer_url: `https://explorer.solana.com/tx/${encodeURIComponent(launchSignature)}`
        }
      : null,
    storage_policy: "Store locators and provenance only. Do not mirror dataset rows, metadata JSON, images or other media by default.",
    limitations: [
      "A source link does not prove that the source is currently reachable or that a matching row exists.",
      "The dataset is a sampled recorder snapshot with documented decoder and coverage limitations.",
      "CC BY 4.0 attribution is retained; reuse must still respect the dataset's documented limitations and any rights in linked media.",
      "Provider labels such as rugged are observations under that provider's rule, not proof of fraud or abandonment."
    ]
  };
}
