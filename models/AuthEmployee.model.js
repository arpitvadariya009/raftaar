const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const authEmployeeSchema = new mongoose.Schema(
    {
        // Face Recognition
        image: { type: String },

        descriptor: {
            type: [Number],
            validate: {
                validator: function (v) {
                    return !v || v.length === 0 || v.length === 128;
                },
                message: "Descriptor must be a 128D array",
            },
        },

        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        // ========================
        // 🧾 Personal Details
        // ========================
        firstName: {
            type: String,
            required: true, // *
            trim: true,
        },

        lastName: {
            type: String,
            required: true, // *
            trim: true,
        },

        fullName: {
            type: String,
            trim: true,
        },

        fatherName: {
            type: String,
            trim: true,
        },

        dateOfBirth: {
            type: Date,
            required: true, // *
        },

        gender: {
            type: String,
            enum: ["Male", "Female", "Not Discussed"],
            required: true, // *
        },

        bloodGroup: {
            type: String,
            enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
        },

        maritalStatus: {
            type: String,
            enum: ["Single", "Married", "Divorced", "Widow"],
        },

        // ========================
        // 📞 Contact Details
        // ========================
        email: {
            type: String,
            required: true, // *
            unique: true,
            lowercase: true,
            trim: true,
        },

        contactNumber: {
            type: String,
            required: true, // *
        },

        countryCode: {
            type: String,
            required: true, // *
        },

        dialCode: {
            type: String,
            required: true, // *
        },

        emergencyContact: {
            type: String,
        },

        emergencyCountryCode: {
            type: String,
        },

        emergencyDialCode: {
            type: String,
        },

        emergencyRelation: {
            type: String,
            enum: [
                "Spouse",
                "Parents",
                "Grand Parents",
                "Children",
                "Relative",
                "Other",
            ],
        },

        address: {
            type: String,
            required: true, // *
        },

        // ========================
        // 💼 Employment Details
        // ========================
        dateOfJoining: {
            type: Date,
            required: true, // *
        },

        department: {
            type: String,
            enum: [
                "Accounts",
                "Production",
                "Human Resources",
                "Digital Marketing",
                "CRM",
                "Sales",
                "Marketing",
                "Executive Assistant",
                "MDO",
                "Purchase",
                "Store",
                "Disaptch",
                "Quality",
                "Maintenance",
                "Electrical",
                "Mechanical",
                "Packing",
                "Administrator",
                "House Keeping",
                "Data Management",
                "Other",
            ],
            required: true, // *
        },

        designation: {
            type: String,
            required: true, // *
        },

        reportingHead: {
            type: String,
            required: true, // *
        },

        employmentType: {
            type: String,
            enum: ["Company Name", "if Other then Name"],
            required: true, // *
        },

        employmentCategory: {
            type: String,
            required: true, // *
        },

        applicationPlanType: {
            type: String,
            enum: [1, 2], // 1 for Basic, 2 for Pro
            default: 1,
        },

        // ========================
        // 🎓 Skills & Qualifications
        // ========================
        highestQualification: {
            type: String,
            enum: [
                "Schooling",
                "Graduated",
                "Post Graduated",
                "Diploma",
                "Other",
            ],
        },

        yearsOfExperience: {
            type: Number,
        },

        skills: [
            {
                type: String,
                trim: true,
            },
        ],

        // ========================
        // 💰 Salary Details
        // ========================
        grossSalary: {
            type: Number,
            required: true, // *
        },

        paymentMode: {
            type: String,
            enum: ["Bank Transfer", "Contrator Transfer"],
        },

        bankName: {
            type: String,
        },

        accountNumber: {
            type: String,
        },
        password: {
            type: String,
        },
        // ⚠️ Admin use only — stores original plain text password
        originalPassword: {
            type: String,
        },
        token: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Auto fullName + Password Hashing
authEmployeeSchema.pre("save", async function () {
    // Auto fullName
    if (this.firstName && this.lastName) {
        this.fullName = `${this.firstName} ${this.lastName}`;
    }

    // Bcrypt password hash (only if password is new or changed)
    if (this.isModified("password") && this.password) {
        // Save original password for admin reference BEFORE hashing
        this.originalPassword = this.password;
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
});

// Note: email index is already created via unique:true in schema definition

module.exports = mongoose.model("AuthEmployee", authEmployeeSchema);