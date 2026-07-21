import React, {useEffect, useState} from 'react'
import { Navigate } from 'react-router-dom'
import API_BASE from '../../config'

const ProtectedRoute = ({children}) => {

    const [isAuthenticated, setIsAuth] = useState(null)

    useEffect(() =>{
        const checkAuth = async(retries = 3, delay = 500) =>{
            try{
                const res = await fetch(`${API_BASE}/me`, {
                    credentials:"include"
                })
                if(res.ok){
                    setIsAuth(true)
                } else if(retries > 0){
                    // Session cookie may not be ready yet (e.g. after login redirect)
                    // Retry after a short delay
                    setTimeout(() => checkAuth(retries - 1, delay), delay)
                } else {
                    setIsAuth(false)
                }
            }
            catch(err){
                if(retries > 0){
                    setTimeout(() => checkAuth(retries - 1, delay), delay)
                } else {
                    setIsAuth(false)
                }
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