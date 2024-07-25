const express = require("express")
const { getUsers, login, register, getUser, getFollow, getFollowers, getArticleUser, changeProfile, getAuthors, editProfile } = require("../Controllers/authController")
const router = express.Router()
const  authMiddleware  = require("../Middlewares/authMiddleware")

router.post("/login", login)
router.post("/register", register)
router.post("/:username", authMiddleware, getUser)
router.post("/change-profile/user", authMiddleware, changeProfile)
router.post("/edit/profile/detaills", authMiddleware, editProfile)
router.post('/follow/:id', authMiddleware, getFollow);
router.post('/followers/:id', authMiddleware, getFollowers);
router.post("/profile/authors", getAuthors)
router.get("/user/articles", getArticleUser)

module.exports = router