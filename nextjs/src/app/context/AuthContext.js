"use client"

import { createContext, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const router = useRouter();

    const login = async (username, password) => {
        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'password');
            params.append('username', username);
            params.append('password', password);

            const response = await axios.post(
            'http://localhost:8000/auth/token',
            params.toString(),
            { headers: {'Content-Type': 'application/x-www-form-urlencoded'} }
            );

            axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
            localStorage.setItem('token', response.data.access_token);
            setUser(response.data);
            router.push('/destinations');
        } catch (error) {
            console.log('Login Failed:', error);
        }
    };


    const logout = () => {
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
        router.push('/login')
    };

    return (
        <AuthContext.Provider value={{ user, login, logout}}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;