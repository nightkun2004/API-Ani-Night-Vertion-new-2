const User = require("../Models/UserModel")
const Article = require("../Models/ArticleModel")
const HttpError = require("../Models/ErrorModel")
const crypto = require("crypto")
const path = require("path")
const fs = require("fs")
const { uploadFile } = require("../server")

// ==================== CREATE Article POST
// POST /api/post/article/create
const CreateArticle = async (req, res, next) => {
    try {
        const { title, tags, content, categories } = req.body;
        const { thumbnail, images } = req.files;
        const userID = req.user.id;

        if (!thumbnail) {
            return next(new HttpError("No thumbnail uploaded.", 422));
        }

        if (!images || images.length === 0) {
            return next(new HttpError("No images uploaded.", 422));
        }

        const tagsArray = tags ? tags.split('#').map(tag => tag.trim()).filter(tag => tag) : [];

        let postId = crypto.randomUUID();

        // อัปโหลดภาพปก
        let thumbnailFilename = generateFilename(thumbnail);
        let thumbnailUploadPath = path.join(__dirname, '..', 'uploads', 'thumbnails', thumbnailFilename);
        await thumbnail.mv(thumbnailUploadPath);

        // อัปโหลดภาพประกอบ
        let imageUrls = [];
        if (Array.isArray(images)) {
            for (let image of images) {
                let newFilename = generateFilename(image);
                let uploadPath = path.join(__dirname, '..', 'uploads', 'articlesImages', newFilename);
                await image.mv(uploadPath);
                imageUrls.push(`${newFilename}`);
            }
        } else {
            let newFilename = generateFilename(images);
            let uploadPath = path.join(__dirname, '..', 'uploads', 'articlesImages', newFilename);
            await images.mv(uploadPath);
            imageUrls.push(`${newFilename}`);
        }


        const useridnew = await User.findById(userID)

        const postcreate = {
            title: title,
            content: content,
            categories: Array.isArray(categories) ? categories : [categories],
            tags: tagsArray,
            thumbnail: `${thumbnailFilename}`, // ภาพ thumbnail
            imagesarticle: imageUrls, // ภาพประกอบหลายไฟล์
            urlslug: postId,
            published: req.body.published === 'on',
            creator: {
                id: useridnew._id,
                username: useridnew.username,
                profilePicture: useridnew.profilePicture
            },
            createdAt: Date.now()
        };

        const Articlesave = new Article(postcreate);
        await Articlesave.save();
        await User.findByIdAndUpdate(userID, { $push: { articles: Articlesave._id } }, { new: true });
        res.status(200).json(Articlesave);

    } catch (err) {
        return next(new HttpError(err))
    }
}

// สุ่ม generateFilename
const generateFilename = (file) => {
    let fileName = file.name;
    let splittedFilename = fileName.split('.');
    return crypto.randomUUID() + "." + splittedFilename[splittedFilename.length - 1];
};




// ============================= DELETE Post
// DELETE : /api/posts/post/article/delete/:id
const deletePostArticle = async (req, res, next) => {
    try {
        const postId = req.params.id;
        if (!postId) {
            return res.status(404).json("เราไม่พบโพสต์ของคุณ")
        }

        // ค้นหาโพสต์
        const post = await Article.findById(postId);
        if (!post) {
            return res.status(404).json("เราไม่พบโพสต์บทความของคุณ")
        }

        const thumbnailFileName = post.thumbnail;
        const imagesFileNames = post.imagesarticle;

        // ลบไฟล์
        if (thumbnailFileName) {
            fs.unlink(path.join(__dirname, '..', 'uploads', 'thumbnails', thumbnailFileName), (err) => {
                if (err) {
                    console.error('Error removing thumbnail:', err);
                }
            });
        }

        if (Array.isArray(imagesFileNames)) {
            imagesFileNames.forEach((fileName) => {
                fs.unlink(path.join(__dirname, '..', 'uploads', 'articlesImages', fileName), (err) => {
                    if (err) {
                        console.error('Error removing image:', err);
                    }
                });
            });
        }

        // ลบโพสต์
        await Article.findByIdAndDelete(postId);

        // ลบ ID ของบทความจาก User โมเดล
        await User.updateMany(
            { articles: postId },
            { $pull: { articles: postId } }
        );

        res.status(200).json(`ทำการลบโพสต์ที่มีไอดี ${postId} เสร็จแล้ว`);

    } catch (error) {
        return next(new HttpError(error.message || "เกิดข้อผิดพลาดในการลบโพสต์", 500));
    }
};




// ============================= EDIT Post
// POST : /api/posts/post/article/edit/:id
const EditPostArticle = async (req, res, next) => {
    try {
        const postId = req.params.id;
        let { title, tags, content } = req.body;

        // ตรวจสอบข้อมูลที่ต้องการ
        if (!title || !tags || !content) {
            return res.status(402).json({ message: "Fill in all fields and ensure description is at least 12 characters long." });
        }

        const tagsArray = tags ? tags.split('#').map(tag => tag.trim()).filter(tag => tag) : [];

        if (!req.files || !req.files.thumbnail) {
            // Update post without changing thumbnail
            const updatedPost = await Article.findByIdAndUpdate(postId, { title, tags: tagsArray, content }, { new: true });
            if (!updatedPost) {
                return res.status(400).json({ message: "Couldn't update post." });
            }
            return res.status(200).json(updatedPost);
        }

        // Update post with new thumbnail
        const oldPost = await Article.findById(postId);
        if (!oldPost) {
            return res.status(404).json({ message: "Post not found." });
        }

        // Delete old thumbnail if exists
        const oldThumbnailPath = path.join(__dirname, '..', 'uploads', 'thumbnails', oldPost.thumbnail);
        fs.unlink(oldThumbnailPath, async (err) => {
            if (err) {
                return next(new HttpError(err.message || "Error deleting old thumbnail", 500));
            }

            const { thumbnail } = req.files;
            if (thumbnail.size > 5000000) {
                return res.status(400).json({ message: "Image size exceeds 5MB limit" });
            }

            const fileName = thumbnail.name;
            const splittedFilename = fileName.split('.');
            const newFilename = splittedFilename[0] + crypto.randomUUID() + "." + splittedFilename[splittedFilename.length - 1];
            const newThumbnailPath = path.join(__dirname, '..', 'uploads', 'thumbnails', newFilename);

            thumbnail.mv(newThumbnailPath, async (err) => {
                if (err) {
                    return next(new HttpError(err.message || "Error moving new thumbnail", 500));
                }

                // Update post with new thumbnail
                const updatedPost = await Article.findByIdAndUpdate(postId, { title, tags: tagsArray, content, thumbnail: newFilename }, { new: true });
                if (!updatedPost) {
                    return res.status(400).json({ message: "Couldn't update post." });
                }
                res.status(200).json(updatedPost);
            });
        });
    } catch (error) {
        return next(new HttpError(error.message || "เกิดข้อผิดพลาดในการแก้ไขโพสต์", 500));
    }
};


// =========================== LIKE POST ARTICLE
// PUT: /api/posts/post/article/like/:id
const likePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const post = await Article.findById(id);
        if (!post) {
            return res.status(404).json("โพสต์ไม่พบ")
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json("ผู้ใช้ไม่พบ")
        }

        // Check if user has already liked the post
        const hasLiked = post.likes.includes(userId);

        if (hasLiked) {
            // Remove like
            post.likes = post.likes.filter(like => like.toString() !== userId);
        } else {
            // Add like
            post.likes.push(userId);
        }

        post.likesCount = post.likes.length;

        await post.save();

        res.status(200).json({
            message: hasLiked ? "ยกเลิกไลค์โพสต์แล้ว" : "ไลค์โพสต์แล้ว",
            likesCount: post.likesCount
        });
    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
}


// =========================== GET replies for ARTICLE
// GET: /api/posts/post/article/replies/:id
const getRepliesForArticle = async (req, res, next) => {
    try {
        // รับ id ของบทความจากพารามิเตอร์
        const articleId = req.params.id;
        
        const article = await Article.findById(articleId)
        .populate({
            path: 'replies',
            select: 'username profilePicture '
        });
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }
        res.status(200).json({ replies: article.replies });
    } catch (error) {
        return next(new HttpError(error.message || 'Error fetching replies', 500));
    }
};


// =========================== replies POST ARTICLE
// POST: /api/posts/post/article/replies/:id
const repliesArticle = async (req, res, next) => {
    try {
        const userID = req.user.id;
        const { repliestext } = req.body;

        if (!repliestext || repliestext.trim() === '') {
            return res.status(400).json({ message: 'Comment text is required' });
        }

        const article = await Article.findById(req.params.id);
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        const useridnew = await User.findById(userID)

        const newReply = {
            username: {
                id: useridnew._id,
                username: useridnew.username,
                profilePicture: useridnew.profilePicture
            },
            repliestext: repliestext.trim(),
            createdAt: new Date()
        };

        // เพิ่มความคิดเห็นใหม่ลงในบทความ
        article.replies.push(newReply);
        await article.save();

        res.status(201).json(newReply);
    } catch (error) {
        return next(new HttpError(error.message || 'Error adding reply to article', 500));
    }
};


// DELETE: /api/posts/post/article/comment/delete/:commentId
const deleteComment = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        const article = await Article.findOne({ 'replies._id': commentId });
        if (!article) {
            return res.status(404).json({ message: 'Article or Reply not found' });
        }

        const reply = article.replies.id(commentId);
        if (!reply) {
            return res.status(404).json({ message: 'Reply not found' });
        }

        if (reply.username.id.toString() !== userId) {
            return res.status(403).json({ message: 'คุณไม่ได้รับอนุญาตให้ลบการตอบกลับนี้' });
        }

        article.replies.pull(commentId);
        await article.save();

        res.status(200).json({ message: 'ลบการความคิดเห็นเรียบร้อยแล้ว' });
    } catch (error) {
        return next(new HttpError(error.message || 'Error deleting reply', 500));
    }
};


// ============================= get SINGLE POST
// GET : /api/posts/read/:urlslug
const getPost = async (req,res, next) =>{
    try {
        const urlslug = req.params.urlslug;

        // Find the post by the 'urlslug'
        const post = await Article.findOne({ urlslug: urlslug });
        if (!post) {
            return res.status(404).json({massage: "โพสต์ที่ค้นหาไม่พบ"})
        }

        // Return the found post
        res.status(200).json(post);
    } catch (error) {
        return next(new HttpError(error.message || 'เกิดข้อผิดพลาดในการค้นหาโพสต์', 500));
    }
}

// ============================= GET POSTS BY CATEGORY
// GET : /api/posts/categorys/:category
const getCatPost = async (req,res, next) =>{
    try {
        const {category} = req.params.category;
        const catPost = await Article.find({category}).sort({category: -1})
        res.status(200).json(catPost)
    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
}


// ============================= GET AUTHOR POST
// GET : /api/posts/user/:id
const getUserPosts = async (req,res, next) =>{
    try {
        const postId = req.params.id; 
        
        const posts = await Article.find({ 'creator.id': postId }).sort({ createdAt: -1 }).exec();
        
        // Return the found posts
        res.status(200).json(posts);
    } catch (error) {
        return next(new HttpError(error.message || 'Error fetching posts', 500));
    }
}



module.exports = { CreateArticle, getPost, getCatPost, deletePostArticle, EditPostArticle, likePost, repliesArticle, getRepliesForArticle,
    deleteComment, getUserPosts }