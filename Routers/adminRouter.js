const express = require("express")
const { registerAdmin,loginAdmin,approveUser,getUsers,getUserNotifications } = require("../Controllers/adminController")
const router = express.Router()
const  authAdminMiddleware  = require("../Middlewares/AdminMiddleware")
const  authorizeRole  = require("../Middlewares/authorizeMiddleware")

router.post("/register/admin", registerAdmin)
router.post("/login/admin", loginAdmin)
router.put("/approve/:userId",authAdminMiddleware, authorizeRole('superadmin'), approveUser)
router.post("/users", getUsers)
router.post("/notifications/:userId", getUserNotifications)

router.get('/superadmin-only', authAdminMiddleware, authorizeRole('superadmin', 'moderator'), (req, res) => {
    res.status(200).json({ message: 'Welcome, superadmin or moderator!' });
});


module.exports = router