const User = require("../Models/UserModel")
const Article = require("../Models/ArticleModel")
const HttpError = require("../Models/ErrorModel")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const fs = require("fs")
const path = require("path")
const { v4: uuidv4 } = require('uuid');
const crypto = require("crypto")

// POST: /api/users/login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'ข้อมูลที่ส่งมาไม่ครบถ้วน' });
        }

        const normalizedEmail = email.toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้นี้ในระบบ' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
        }

        const { _id: id, username } = user;
        const token = jwt.sign({ id, username }, process.env.JWT_SECRET, { expiresIn: "1d" });

        res.status(200).json({ token, id, username });
    } catch (error) {
        return next(new HttpError(error))
    }
}

// POST: /api/users/register
const register = async (req, res, next) => {
    try {
        const { username, email, password, password2 } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'ข้อมูลที่ส่งมาไม่ครบถ้วน' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
        }

        if (password != password2) {
            return res.status(400).json({ message: 'รหัสผ่านขอคุณไม่ตรงกัน' });
        }

        // ตรวจสอบความปลอดภัยของรหัสผ่าน (ตัวอย่างเช่น การมีอักขระต่างๆ)
        // const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@#$!%*?&]{6,}$/;
        // if (!passwordRegex.test(password)) {
        //     return res.status(400).json({ message: 'รหัสผ่านต้องมีตัวอักษรตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษอย่างน้อยหนึ่งตัว' });
        // }

        // ตรวจสอบอีเมลที่ซ้ำ
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'อีเมลนี้ถูกใช้ไปแล้ว' });
        }

        // เข้ารหัสรหัสผ่าน
        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
        });

        await newUser.save();
        const token = jwt.sign(
            { id: newUser._id, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.cookie('token', token, { httpOnly: true, secure: true });
        res.status(201).json({
            message: 'สมัครสำเร็จ',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email
            },
            token
        });

    } catch (error) {
        return next(new HttpError(error))
    }
}

// ===================== Get User
// GET : /api/users/profile?u=username
const getUser = async (req, res, next) => {
    try {
        const username = req.query.u;

        const user = await User.findOne({ username: username }).select('-password');

        // ตรวจสอบว่าพบผู้ใช้หรือไม่
        if (!user) {
            return next(new HttpError("ไม่พบผู้ใช้งาน", 404));
        }

        // ส่งข้อมูลผู้ใช้
        res.status(200).json(user);

    } catch (error) {
        return next(new HttpError(error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', 500));
    }
};


// ===================== Get Articles
// GET : /api/users/user/articles/?u=username
const getArticleUser = async (req, res, next) => {
    try {
        const username = req.query.u;

        const userData = await User.findOne({ username: username })
            .populate('articles').exec();

        if (!userData) {
            return res.status(401).json({ message: 'เกดข้อผิดพลากการดึงข้อมูลจาก UserData', });
        }

        // ส่งข้อมูลผู้ใช้
        res.status(200).json(userData.articles);

    } catch (error) {
        return next(new HttpError(error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', 500));
    }
};


// =====================changeProfile
// POST : /api/users/change-profile
const changeProfile = async (req, res, next) => {
    try {
        if (!req.files || !req.files.avatar) {
            return res.status(422).json({ message: 'กรุณาเลือกรูปภาพ', });
        }
        // console.log(req.files)

        const user = await User.findById(req.user.id);

         // delete old avatar if exists
         if (user.profilePicture) {
            fs.unlink(path.join(__dirname, '..', '/uploads/profiles', user.profilePicture), (err) => {
                if (err) {
                    return next(new HttpError(err.message, 500));
                }
            });
        }

        const { avatar } = req.files;
        // console.log(avatar)

        // check file size
        if (avatar.size > 5000000) {
            return res.status(422).json({ message: 'รูปภาพของคุณต้องมีขนาดไม่เกิน 5MB', });
        }
        
        let fileName = avatar.name;
        let splittedFilename = fileName.split('.');
        let newFilename = splittedFilename[0] + crypto.randomUUID()  + '.' + splittedFilename[splittedFilename.length - 1];

        avatar.mv(path.join(__dirname, '..', '/uploads/profiles', newFilename), async (err) => {
            if (err) {
                return next(new HttpError(err.message, 500));
            }

            const updateAvatar = await User.findByIdAndUpdate(req.user.id, { profilePicture: newFilename }, { new: true });

            if (!updateAvatar) {
                return next(new HttpError("ไม่สามารถเปลี่ยนอวาตาร์ได้", 422));
            }

            res.status(200).json(updateAvatar);
        });

    } catch (error) {
        return next(new HttpError(error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', 500));
    }
};


// =====================changeProfile
// POST : /api/users/edit/profile/detaills
const editProfile = async (req, res, next) => {
    try {
        const { username, email, currentPassword, newPassword, confirmNewPassword } = req.body;

        if (!username || !email || !currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(422).json({ message: 'Fill in all fields', });
        }

        // Get user from database
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(403).json({ message: 'ไม่พบผู้ใช้', });
        }

        // Check if the new email is already used by another user
        const emailExist = await User.findOne({ email });
        if (emailExist && emailExist._id.toString() !== req.user.id.toString()) {
            return res.status(422).json({ message: 'อีเมลของคุณพร้อมใช้งานแล้ว', });
        }

        // Validate current password
        const validateUserPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validateUserPassword) {
            return res.status(422).json({ message: 'รหัสผ่านเดิมไม่ถูกต้อง', });
        }

        // Check if new passwords match
        if (newPassword !== confirmNewPassword) {
            return res.status(422).json({ message: 'รหัสผ่านของคุณไม่ต้องกัน', });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

         // Update user info in database
         const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            {
                username,
                email,
                password: hashedPassword
            },
            { new: true }
        );

        if (!updatedUser) {
            return next(new HttpError("Unable to update profile.", 500));
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        return next(new HttpError(error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', 500));
    }
};

// ===================== GETAUTHORS
// POST : /api/users/authors
const getAuthors = async (req, res, next) => {
    try {
        const authhors = await User.find().select('-password');
        res.json(authhors)
    } catch (error) {
        return next(new HttpError(error));
    }
}

// ===================== GETAUTHORS
// POST : /api/users/authors/channel/:channel
const getChannel= async (req, res, next) => {
    const { channelID } = req.params.channel;
    try {
        const authhors = await User.findById(channelID).select('-password');
        res.json(authhors)
    } catch (error) {
        return next(new HttpError(error));
    }
}

// ===================== ติดตามผู้ใช้งาน
const getFollow = async (req, res, next) => {
    try {
        const followingId = req.params.id; // ID ของผู้ใช้ที่ต้องการติดตาม
        const followerId = req.user.id; // ID ของผู้ใช้ที่ติดตาม

        // ตรวจสอบว่าไม่สามารถติดตามตัวเองได้
        if (followerId === followingId) {
            return next(new HttpError("คุณไม่สามารถติดตามตัวเองได้", 400));
        }

        // ตรวจสอบว่าผู้ใช้ที่ต้องการติดตามนั้นอยู่ในรายการที่ผู้ใช้ติดตามอยู่แล้วหรือไม่
        const user = await User.findById(followerId);
        if (user.following.includes(followingId)) {
            return next(new HttpError("คุณติดตามผู้ใช้งานนี้แล้ว", 400));
        }

        // อัปเดตผู้ใช้ที่ติดตาม
        await User.findByIdAndUpdate(followerId, {
            $push: { following: followingId }
        });

        // อัปเดตผู้ใช้ที่ถูกติดตาม
        await User.findByIdAndUpdate(followingId, {
            $push: { followers: followerId }
        });

        res.status(201).json({ message: "ติดตามผู้ใช้งานสำเร็จ" });

    } catch (error) {
        return next(new HttpError(error.message || 'เกิดข้อผิดพลาดในการติดตามผู้ใช้งาน', 500));
    }
};


// ===========================GET followers และ following
// GET /api/user/:id/followers
const getFollowers = async (req, res, next) => {
    try {
        const userId = req.params.id; // ID ของผู้ใช้ที่ต้องการดึงข้อมูล
        const currentUserId = req.user.id; // ID ของผู้ใช้ที่ทำการดึงข้อมูล

        // ค้นหาผู้ใช้ที่ต้องการ
        const user = await User.findById(userId).populate('followers', 'username email profilePicture');
        if (!user) {
            return next(new HttpError("ไม่พบผู้ใช้งาน", 404));
        }

        // ค้นหาผู้ใช้ที่ติดตามผู้ใช้ที่ต้องการ
        const followers = user.followers;

        // ตรวจสอบการยกเลิกการติดตาม
        if (currentUserId) {
            // ตรวจสอบว่าผู้ใช้ปัจจุบันติดตามผู้ใช้ที่ต้องการหรือไม่
            const isFollowing = user.followers.some(f => f._id.toString() === currentUserId);

            if (isFollowing) {
                // ยกเลิกการติดตาม
                await User.findByIdAndUpdate(userId, {
                    $pull: { followers: currentUserId }
                });

                await User.findByIdAndUpdate(currentUserId, {
                    $pull: { following: userId }
                });

                return res.status(200).json({ message: 'ยกเลิกการติดตามแล้ว' });
            } else {
                return res.status(400).json({ message: 'คุณไม่ได้ติดตามผู้ใช้งานนี้' });
            }
        }

        // ส่งข้อมูลผู้ติดตามและผู้ติดตาม
        const following = await User.find({ following: userId }).populate('following', 'username email profilePicture');

        res.status(200).json({
            followers: followers,
            following: following
        });

    } catch (error) {
        return next(new HttpError(error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ติดตามและผู้ติดตาม', 500));
    }
};



module.exports = {
    login,
    getAuthors,
    register,
    getUser,
    getArticleUser,
    changeProfile,
    editProfile,
    getFollow,
    getFollowers,
    getChannel
}