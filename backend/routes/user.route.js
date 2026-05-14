import express from "express";

import {
    login,
    logout,
    register,
    updateProfile
} from "../controllers/user.controller.js";

import isAuthenticated from "../middlewares/isAuthenticated.js";

import { singleUpload } from "../middlewares/mutler.js";

const router = express.Router();

// REGISTER
router.route("/register").post(
    singleUpload,
    register
);

// LOGIN
router.route("/login").post(
    login
);

// LOGOUT
router.route("/logout").get(
    logout
);

// UPDATE PROFILE
router.route("/profile/update").post(
    isAuthenticated,
    singleUpload,
    updateProfile
);

export default router;