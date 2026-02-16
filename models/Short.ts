import mongoose, { Schema, model, models } from 'mongoose';

const ShortSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    type: {
        type: String,
        enum: ['action', 'realization', 'goal'],
        required: true
    },
    sourceEntryId: { type: Schema.Types.ObjectId, ref: 'Entry' },
    isCompleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Short = models.Short || model('Short', ShortSchema);

export default Short;
