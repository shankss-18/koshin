import React, {useEffect, useState} from 'react'
import { Navigate } from 'react-router-dom'
import API_BASE from '../../config'

const ProtectedRoute = ({children}) => {

    const [isAuthenticated, setIsAuth] = useState(null)

    useEffect(() =>{
        const checkAuth = async() =>{
            try{
                const res = await fetch(`${API_BASE}/me`, {
                    credentials:"include"
                })
                setIsAuth(res.ok)
            }
            catch(err){
                setIsAuth(false)
            }
        }
        checkAuth()
    },[])
    if(isAuthenticated === null){
        return <div className="flex justify-center items-center min-h-screen text-gray-400">Loading...</div>
    }
    return isAuthenticated ? children : <Navigate to="/login" replace/>
}

export default ProtectedRoute