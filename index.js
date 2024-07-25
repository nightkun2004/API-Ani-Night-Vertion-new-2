const express = require("express")
const app = express();
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const path = require("path")
require("dotenv").config()

const authRouter = require("./Routers/authRouter")
const PostArticleRouter = require("./Routers/posrtArticleRouter")
const AdminRouter = require("./Routers/adminRouter")

app.get("/", (req, res) => {
    res.send("Hellow World")
})
const corsOptions = {
    origin: '*',
    credentials: true,
};

app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }))
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(fileUpload());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api/users", authRouter)
app.use("/api/posts", PostArticleRouter)
app.use("/api/admin", AdminRouter)

app.listen(process.env.PORT, () => {
    console.log(`Server in runing to port ${process.env.PORT}`)
})