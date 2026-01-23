import User from "../models/User_schema.js";
import bcrypt from "bcryptjs";
import IdcodeServices from "../idcode/idcode.service.js";


export const addUser = async (data) => {
  const existingUser = await User.findOne({
    $or: [{ email: data.email }, { phonenumber: data.phonenumber }],
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  
  const user_id = await IdcodeServices.generateCode("USER");
  if (!user_id) {
    throw new Error("Failed to generate user ID");
  }

  const rawPassword = data.password || "User@123";
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const user = await User.create({
    ...data,
    user_id,           
    password: hashedPassword,
  });

  return user;
};


export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  if (user.status !== "Active") {
    throw new Error("User is inactive");
  }

  return user;  
};

/* ================= GET USERS ================= */
export const getUser = async (page = 1, limit = 8) => {
  const skip = (page - 1) * limit;

  const totalItems = await User.countDocuments();

  const users = await User.find()
    .select("-password")
    .sort({  })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    users,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      itemsPerPage: limit,
    },
  };
};


export const updateUser = async (id, data) => {
  const user = await User.findById(id);
  if (!user) {
    throw new Error("User not found");
  }

  user.name = data.name;
  user.email = data.email;
  user.phonenumber = data.phonenumber;
  user.role = data.role;

  await user.save();
  return user;
};

export const removeUser = async (id) =>
  await User.findByIdAndDelete(id);

export const changePassword = async (id, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const user = await User.findByIdAndUpdate(
    id,
    { password: hashedPassword },
    { new: true }
  );

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

