const mongoose = require("../config")

const AdminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String
    },
    role: {
        type: String,
        enum: ["superadmin", "moderator"],
        required: true
    }
}, { timestamps: true });

const Admin = mongoose.model("Admin", AdminSchema);

module.exports = Admin;