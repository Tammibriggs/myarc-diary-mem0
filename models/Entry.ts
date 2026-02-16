import mongoose, { Schema, model, models } from 'mongoose';

const EntrySchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    tags: [{ type: String }],
    date: { type: Date, default: Date.now },
    sentiment: { type: String },
    aiAnalysis: { type: Schema.Types.Mixed }, // Store arbitrary AI metadata
}, { timestamps: true });

const Entry = models.Entry || model('Entry', EntrySchema);

export default Entry;
