const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const FormData = require("form-data");
const axios = require("axios");
const FileRecord = require("./Models/FileRecordModel");

// พาธสำหรับเก็บไฟล์หลัก
const primaryStoragePath = path.join(__dirname, 'uploads', 'primary');

// ฟังก์ชันสำหรับอัปโหลดไฟล์ไปยังเซิร์ฟเวอร์สำรอง
const uploadToBackupServer = async (file, serverUrl) => {
    try {
        const form = new FormData();
        form.append('file', file.data, { filename: file.name });

        const response = await axios.post(`${serverUrl}/uploads`, form, {
            headers: {
                ...form.getHeaders(),
            },
        });

        return response.data;
    } catch (error) {
        throw new Error(`Failed to upload to backup server: ${error.message}`);
    }
};

// ฟังก์ชันหลักในการอัปโหลดไฟล์
const uploadFile = async (req, res, next) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        const file = req.files.file;
        const stats = await fs.promises.stat(primaryStoragePath);

        const MINIMUM_SPACE_REQUIRED = 10 * 1024 * 1024;

        let serverUsed = 'primary'; 

        if (stats.size < MINIMUM_SPACE_REQUIRED) {
            console.log('Primary server storage is full, switching to backup server');

            // ทดสอบกับเซิร์ฟเวอร์สำรอง 1
            try {
                await uploadToBackupServer(file, 'https://sv2.ani-night.online');
                serverUsed = 'backup1';
                res.status(200).json({ message: 'File uploaded to backup server 1' });
            } catch (error) {
                // ทดสอบกับเซิร์ฟเวอร์สำรอง 2 หากเซิร์ฟเวอร์สำรอง 1 ล้มเหลว
                try {
                    await uploadToBackupServer(file, 'https://sv3.ani-night.online');
                    serverUsed = 'backup2';
                    res.status(200).json({ message: 'File uploaded to backup server 2' });
                } catch (error) {
                    return next(new Error(`Failed to upload to all backup servers: ${error.message}`));
                }
            }
        } else {
            const newFilename = generateFilename(file);
            const uploadPath = path.join(primaryStoragePath, newFilename);

            file.mv(uploadPath, (err) => {
                if (err) {
                    return next(err);
                }
                serverUsed = 'primary';
                res.status(200).json({ message: 'File uploaded to primary server' });
            });
        }
        const fileRecord = new FileRecord({
            filename: file.name,
            server: serverUsed,
            path: path.join(__dirname, 'uploads', serverUsed, generateFilename(file))
        });

        await fileRecord.save();

    } catch (err) {
        next(err);
    }
};

// สุ่ม generateFilename
const generateFilename = (file) => {
    let fileName = file.name;
    let splittedFilename = fileName.split('.');
    return crypto.randomUUID() + "." + splittedFilename[splittedFilename.length - 1];
};

module.exports = { uploadFile };