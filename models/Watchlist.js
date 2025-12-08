import mongoose from 'mongoose';

const watchlistItemSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['mf', 'stock', 'etf'],
        required: true
    },
    itemId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const watchlistSchema = new mongoose.Schema({
    userId: {
        type: String,  // Changed from ObjectId to String for cross-backend compatibility
        required: true
    },
    name: {
        type: String,
        required: true,
        default: 'My Watchlist'
    },
    items: [watchlistItemSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp on save
watchlistSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Index for faster queries
watchlistSchema.index({ userId: 1 });
watchlistSchema.index({ userId: 1, name: 1 });

export default mongoose.model('Watchlist', watchlistSchema);
