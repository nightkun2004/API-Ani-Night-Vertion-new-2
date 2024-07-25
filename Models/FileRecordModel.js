const mongoose = require("../config")

const fileRecordSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    server: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    }
}, { timestamps: true });

const FileRecord = mongoose.model('FileRecord', fileRecordSchema);

module.exports = FileRecord;
