const mongoose = require("../config")

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    serverUrl: {
        type: String,
        enum: ["ani-night.online", "sv1.ani-night.online", "sv2.ani-night.online"],
        default: "api.ani-night.online"
    },
    profilePicture: {
        type: String
    },
    bio: {
        type: String
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    points: {
        type: Number,
        default: 0 
    },
    isFollowing: {
        type: Boolean,
        default: false
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: ["user", "content_creator", "partners"],
        default: "user"
    },
    articles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article'
    }], 
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);

module.exports = User;