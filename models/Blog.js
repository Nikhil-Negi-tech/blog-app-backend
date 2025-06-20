const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Pre-save hook to generate and enforce a unique slug
blogSchema.pre('validate', async function(next) {
  if (this.isNew || this.isModified('title')) {
    // Normalize title to slug-friendly format
    const baseSlug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')    // Remove non-alphanumeric chars[2]
      .replace(/[\s_-]+/g, '-')    // Convert spaces/underscores to hyphens[2]
      .replace(/^-+|-+$/g, '');    // Trim leading/trailing hyphens[2]

    // Fallback slug if title yields empty string
    let uniqueSlug = baseSlug || 'untitled';
    let counter = 1;

    // Ensure slug uniqueness by checking existing docs
    while (await this.constructor.exists({ slug: uniqueSlug, _id: { $ne: this._id } })) {
      uniqueSlug = `${baseSlug}-${counter++}`; 
    }

    this.slug = uniqueSlug;
  }
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
