import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Persistent translation cache. Each unique (language, source-string) pair is
 * translated ONCE by the model and stored here, then reused forever — across
 * requests, server restarts, and deploys. This is what lets us localise
 * incoming DB data without re-spending tokens every render.
 *
 * `srcHash` (sha-256 of the source) is what we index on, because source
 * strings can exceed Mongo's ~1 KB index-key limit.
 */
export interface ITranslation extends Document {
  lang: string;      // target language code, e.g. "hi"
  srcHash: string;   // sha-256 of `source`
  source: string;    // original (English) text
  text: string;      // translated text
}

const translationSchema = new Schema<ITranslation>(
  {
    lang:    { type: String, required: true },
    srcHash: { type: String, required: true },
    source:  { type: String, required: true },
    text:    { type: String, required: true },
  },
  { timestamps: true }
);

// One cached translation per (language, source).
translationSchema.index({ lang: 1, srcHash: 1 }, { unique: true });

if (process.env.NODE_ENV !== "production" && mongoose.models.Translation) {
  mongoose.deleteModel("Translation");
}

const Translation: Model<ITranslation> =
  mongoose.models.Translation ?? mongoose.model<ITranslation>("Translation", translationSchema);

export default Translation;
