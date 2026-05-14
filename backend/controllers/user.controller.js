import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";

// ================= REGISTER =================

export const register = async (req, res) => {

    try {

        const {
            fullname,
            email,
            phoneNumber,
            password,
            role
        } = req.body;

        console.log("BODY:", req.body);

        console.log("FILE:", req.file);

        if (
            !fullname ||
            !email ||
            !phoneNumber ||
            !password ||
            !role
        ) {
            return res.status(400).json({
                message: "All fields are required.",
                success: false
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists.",
                success: false
            });
        }

        let profilePhotoUrl = "";

        const file = req.file;

        // ===== CLOUDINARY UPLOAD =====

        if (file) {

            try {

                console.log("Uploading to cloudinary...");

                const fileUri = getDataUri(file);

                console.log("FILE URI CREATED");

                console.log(fileUri.content.substring(0, 100));

                const cloudResponse = await cloudinary.uploader.upload(
                    fileUri.content,
                    {
                        folder: "jobportal/profile",
                        resource_type: "auto"
                    }
                );

                console.log("CLOUDINARY SUCCESS");

                console.log(cloudResponse);

                profilePhotoUrl = cloudResponse.secure_url;

            } catch (cloudError) {

                console.log("========= CLOUDINARY ERROR =========");

                console.log(cloudError);

                if (cloudError.error) {
                    console.log(cloudError.error);
                }

                return res.status(500).json({
                    message: "Cloudinary upload failed.",
                    success: false
                });
            }
        }

        // ===== HASH PASSWORD =====

        const hashedPassword = await bcrypt.hash(password, 10);

        // ===== CREATE USER =====

        await User.create({
            fullname,
            email,
            phoneNumber,
            password: hashedPassword,
            role,
            profile: {
                profilePhoto: profilePhotoUrl
            }
        });

        return res.status(201).json({
            message: "Account created successfully.",
            success: true
        });

    } catch (error) {

        console.log("========= REGISTER ERROR =========");

        console.log(error);

        return res.status(500).json({
            message: "Server error during registration.",
            success: false
        });
    }
};

// ================= LOGIN =================

export const login = async (req, res) => {

    try {

        const {
            email,
            password,
            role
        } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({
                message: "All fields are required.",
                success: false
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false
            });
        }

        const isPasswordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordMatch) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false
            });
        }

        if (role !== user.role) {
            return res.status(400).json({
                message: "Account doesn't exist with current role.",
                success: false
            });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.SECRET_KEY,
            {
                expiresIn: "1d"
            }
        );

        const userData = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        };

        return res
            .status(200)
            .cookie("token", token, {
                maxAge: 1 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                sameSite: "strict"
            })
            .json({
                message: `Welcome back ${user.fullname}`,
                user: userData,
                success: true
            });

    } catch (error) {

        console.log("========= LOGIN ERROR =========");

        console.log(error);

        return res.status(500).json({
            message: "Server error during login.",
            success: false
        });
    }
};

// ================= LOGOUT =================

export const logout = async (req, res) => {

    try {

        return res
            .status(200)
            .cookie("token", "", {
                maxAge: 0
            })
            .json({
                message: "Logged out successfully.",
                success: true
            });

    } catch (error) {

        console.log("========= LOGOUT ERROR =========");

        console.log(error);

        return res.status(500).json({
            message: "Server error during logout.",
            success: false
        });
    }
};

// ================= UPDATE PROFILE =================

export const updateProfile = async (req, res) => {

    try {

        const {
            fullname,
            email,
            phoneNumber,
            bio,
            skills
        } = req.body;

        const userId = req.id;

        let user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found.",
                success: false
            });
        }

        let skillsArray = [];

        if (skills) {
            skillsArray = skills
                .split(",")
                .map((skill) => skill.trim());
        }

        const file = req.file;

        // ===== RESUME UPLOAD =====

        if (file) {

            try {

                console.log("Uploading resume to cloudinary...");

                const fileUri = getDataUri(file);

                const cloudResponse = await cloudinary.uploader.upload(
                    fileUri.content,
                    {
                        resource_type: "auto",
                        folder: "jobportal/resumes"
                    }
                );

                console.log("RESUME UPLOAD SUCCESS");

                user.profile.resume = cloudResponse.secure_url;

                user.profile.resumeOriginalName = file.originalname;

            } catch (cloudError) {

                console.log("========= RESUME CLOUDINARY ERROR =========");

                console.log(cloudError);
            }
        }

        // ===== UPDATE USER =====

        if (fullname) user.fullname = fullname;

        if (email) user.email = email;

        if (phoneNumber) user.phoneNumber = phoneNumber;

        if (bio) user.profile.bio = bio;

        if (skillsArray.length > 0) {
            user.profile.skills = skillsArray;
        }

        await user.save();

        return res.status(200).json({
            message: "Profile updated successfully.",
            user,
            success: true
        });

    } catch (error) {

        console.log("========= UPDATE PROFILE ERROR =========");

        console.log(error);

        return res.status(500).json({
            message: "Server error during profile update.",
            success: false
        });
    }
};