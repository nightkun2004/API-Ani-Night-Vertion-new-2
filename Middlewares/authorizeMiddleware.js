// middleware/authorizeRole.js

// const authorizeRole = (...allowedRoles) => {
//     return (req, res, next) => {
//         if (!req.user || !allowedRoles.includes(req.user.role)) {
//             return res.status(403).json({ message: 'ปฏิเสธการเข้าใช้ ' });
//         }
//         next();
//     };
// };

const authorizeRole = (...roles) => {
    return (req, res, next) => {
        const userRole = req.user.role; // บทบาทของผู้ใช้จาก token

        if (roles.includes(userRole)) {
            return next(); // อนุญาตให้เข้าถึง
        } else {
            return res.status(403).json({ message: 'Forbidden: เนื่องจากสิทธิ์การเข้าถึงยังไม่ตรงตามที่นักพัฒนาจัดให้' });
        }
    };
};


module.exports = authorizeRole;
