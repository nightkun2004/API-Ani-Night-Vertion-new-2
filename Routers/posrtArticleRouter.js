const express = require("express")
const router = express.Router();

const authMiddleware  = require("../Middlewares/authMiddleware")
const { CreateArticle, getPost, getCatPost, deletePostArticle, EditPostArticle, likePost, repliesArticle, getRepliesForArticle,
    deleteComment, getUserPosts } = require("../Controllers/createarticleController")

router.post("/article/create", authMiddleware, CreateArticle)
router.post("/post/article/edit/:id", authMiddleware, EditPostArticle)
router.delete("/post/article/delete/:id", authMiddleware, deletePostArticle)
router.delete("/post/article/comment/delete/:commentId", authMiddleware, deleteComment)
router.put("/post/article/like/:id", authMiddleware, likePost)
router.post("/post/article/replies/:id", authMiddleware, repliesArticle)
router.get("/post/article/replies/:id", getRepliesForArticle)
router.get("/read/:urlslug", getPost)
router.get("/categorys/:category", getCatPost)
router.get("/article/user/:id", getUserPosts)


module.exports = router;