const mongoose = require("../config")

const CategoriesSchema = new mongoose.Schema({
    title: {
        type: String,
    },
    description: {
        type: String,
    },
}, { timestamps: true });

const Categories = mongoose.model("Categories", CategoriesSchema);

module.exports = Categories;