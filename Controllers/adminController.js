const User = require('../Models/UserModel');
const Notification = require('../Models/NotificationModel');
const Admin = require('../Models/AdminModel');
const HttpError = require('../Models/ErrorModel');
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")

// ==================== เพิ่มสมัครผู้ดูแลระบบ
// POST /api/admin/register/admin
const registerAdmin = async (req, res, next) => {
    try {
        const { username, email, password, password2, role } = req.body;
        // ตรวจสอบข้อมูลที่จำเป็น
        if (!username || !email || !password || !role) {
            return res.status(400).json({ message: 'ข้อมูลที่ส่งมาไม่ครบถ้วน' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
        }

        if (password != password2) {
            return res.status(401).json({massage:"รหัสผ่านขอคุณไม่ตรงกัน"})
        }

        // ตรวจสอบอีเมล-ของ admin
        const existingUser = await Admin.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'อีเมลนี้ถูกใช้ไปแล้ว' });
        }

        // เข้ารหัสรหัสผ่าน
        const hashedPassword = await bcrypt.hash(password, 12);

        const admin = new Admin({
            username,
            email,
            password: hashedPassword,
            role
        });

        await admin.save();
        const token = jwt.sign(
            { id: admin._id, email: admin.email },
            process.env.JWT_SECRET_ADMIN,
            { expiresIn: '1h' }
        );
        res.cookie('tk', token, { httpOnly: true, secure: process.env.JWT_SECRET_ADMIN === 'production' });
        res.status(201).json({ message: 'ผู้ดูแลระบบลงทะเบียนเรียบร้อยแล้ว',token, admin });
    } catch (error) {
        next(error);
    }
};


// ==================== เข้าสู่ระบบในนามแอดมินหรือผู้ดูแลระบบ
// POST /api/admin/login/admin
const loginAdmin = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(400).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
        }

        const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET_ADMIN, { expiresIn: '1h' });
        res.cookie('tk', token, { httpOnly: true, secure: process.env.JWT_SECRET_ADMIN === 'production' });
        res.status(200).json({
            message: 'เข้าสู่ระบแอดมินสำเร็จ',
            token,
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        next(error);
    }
};

// ฟังก์ชันอนุมัติผู้ใช้
// PUT /api/admin/approve/:userId
const approveUser = async (req, res, next) => {
    try {
        const userId = req.params.userId;

        if (!userId) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        // ค้นหาผู้ใช้
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // ตรวจสอบสถานะปัจจุบันและอัปเดตสถานะ
        if (user.isApproved) {
            // หากผู้ใช้ได้รับการอนุมัติแล้วให้เปลี่ยนเป็นไม่อนุมัติ
            user.isApproved = false;
            user.role = "user";
            await user.save();

            const notification = new Notification({
                userId: user._id,
                message: 'การอนุมัติผู้ใช้ถูกเพิกถอน. บัญชีของคุณถูกยกเลิกการอนุมัติและไม่สามารถสร้างรายได้ได้',
            });
            await notification.save();

            res.status(200).json({ message: 'การอนุมัติผู้ใช้ถูกเพิกถอน', user });
        } else {
            // หากผู้ใช้ยังไม่ได้รับการอนุมัติให้เปลี่ยนเป็นอนุมัติ
            user.isApproved = true;
            user.role = "partners";
            await user.save();

            const notification = new Notification({
                userId: user._id,
                message: 'บัญชีของคุณได้รับการอนุมัติแล้วและคุณสามารถเริ่มสร้างรายได้',
            });
            await notification.save();

            res.status(200).json({ message: 'User approved', user });
        }
    } catch (error) {
        return next(new HttpError(error.message || 'An error occurred'));
    }
};

// ฟังก์ชันดึงข้อมูลผู้ใช้ทั้งหมด
const getUsers = async (req, res, next) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        next(error); // ส่งต่อข้อผิดพลาดไปยัง middleware สำหรับการจัดการข้อผิดพลาด
    }
};

// ฟังก์ชันดึงการแจ้งเตือนของผู้ใช้
const getUserNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ userId: req.params.userId });
        res.status(200).json(notifications);
    } catch (error) {
        next(error); // ส่งต่อข้อผิดพลาดไปยัง middleware สำหรับการจัดการข้อผิดพลาด
    }
};

module.exports = {
    registerAdmin,
    loginAdmin,
    approveUser,
    getUsers,
    getUserNotifications
};
