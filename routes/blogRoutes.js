const express = require('express')
const Blog = require('../models/Blog')
const { protect } = require('../middleware/authMiddleware')
const router = express.Router()

// GET /api/blogs — list published blogs
router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.find({ isPublished: true })
      .populate('author', 'username')
      .sort({ publishedAt: -1 })
    res.json(blogs)
  } catch (error) {
    console.error('Fetch all blogs error:', error)
    res.status(500).json({ message: 'Server error fetching blogs' })
  }
})

// GET /api/blogs/user — list current user's blogs
router.get('/user', protect, async (req, res) => {
  try {
    const blogs = await Blog.find({ author: req.user._id }).sort({ createdAt: -1 })
    res.json(blogs)
  } catch (error) {
    console.error('Fetch user blogs error:', error)
    res.status(500).json({ message: 'Server error fetching user blogs' })
  }
})

// NEW: GET /api/blogs/id/:id — fetch blog by MongoDB ID for editing
router.get('/id/:id', protect, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate('author', 'username')
    if (!blog) return res.status(404).json({ message: 'Blog not found' })
    if (blog.author._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this blog' })
    }
    res.json(blog)
  } catch (error) {
    console.error('Fetch blog by ID error:', error)
    res.status(500).json({ message: 'Server error fetching blog' })
  }
})

// GET /api/blogs/:slug — public fetch by slug
router.get('/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug }).populate('author', 'username')
    if (!blog) return res.status(404).json({ message: 'Blog not found' })
    res.json(blog)
  } catch (error) {
    console.error('Fetch blog by slug error:', error)
    res.status(500).json({ message: 'Server error fetching blog' })
  }
})

// POST /api/blogs — create new blog
router.post('/', protect, async (req, res) => {
  const { title, content, isPublished } = req.body
  if (!title || !content) return res.status(400).json({ message: 'Title and content are required' })
  try {
    const blog = new Blog({
      title: title.trim(),
      content: content.trim(),       // Stores Markdown text
      author: req.user._id,
      isPublished: Boolean(isPublished),
      publishedAt: isPublished ? Date.now() : null
    })
    const created = await blog.save()
    await created.populate('author', 'username')
    res.status(201).json(created)
  } catch (error) {
    console.error('Create blog error:', error)
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors).map(e => e.message).join(', ')
      return res.status(400).json({ message: `Validation failed: ${msg}` })
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Slug must be unique' })
    }
    res.status(500).json({ message: 'Server error creating blog' })
  }
})

// PUT /api/blogs/:id — update existing blog
router.put('/:id', protect, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
    if (!blog) return res.status(404).json({ message: 'Blog not found' })
    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this blog' })
    }
    const { title, content, isPublished } = req.body
    blog.title = title?.trim() || blog.title
    blog.content = content?.trim() || blog.content  // Updates Markdown
    if (isPublished !== undefined && isPublished !== blog.isPublished) {
      blog.isPublished = Boolean(isPublished)
      blog.publishedAt = isPublished ? Date.now() : blog.publishedAt
    }
    const updated = await blog.save()
    res.json(updated)
  } catch (error) {
    console.error('Update blog error:', error)
    res.status(500).json({ message: 'Server error updating blog' })
  }
})

// DELETE /api/blogs/:id — delete a blog
router.delete('/:id', protect, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
    if (!blog) return res.status(404).json({ message: 'Blog not found' })
    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this blog' })
    }
    await blog.deleteOne()
    res.json({ message: 'Blog removed successfully' })
  } catch (error) {
    console.error('Delete blog error:', error)
    res.status(500).json({ message: 'Server error deleting blog' })
  }
})

module.exports = router
