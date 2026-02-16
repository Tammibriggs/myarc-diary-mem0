import { NextResponse } from 'next/server';
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from 'bcryptjs';
import * as yup from 'yup';

const signupSchema = yup.object().shape({
    name: yup.string().required('Name is required'),
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();

        try {
            await signupSchema.validate(body);
        } catch (validationError: any) {
            return NextResponse.json({ error: validationError.message }, { status: 400 });
        }

        const { name, email, password } = body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
        });

        return NextResponse.json({ message: "User created successfully", user: { id: newUser._id, email: newUser.email } }, { status: 201 });
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
