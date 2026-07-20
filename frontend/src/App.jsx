import React from 'react'
import Signup from './pages/signup/Signup'
import Login from './pages/login/Login'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/home/Home'
import Chat from './pages/chat/Chat'
import ProtectedRoute from './pages/protectedroutes/ProtectedRoute'


const App = () => {
  return (
    <Routes>
      <Route path='/login' element={<Login/>}/>
      <Route path='/signup' element={<Signup/>}/>
      <Route path='/' element={<ProtectedRoute><Home/></ProtectedRoute>}/>
      <Route path='/chat/:chatId' element={<ProtectedRoute><Chat /></ProtectedRoute>} />
    </Routes>
    
  )
}

export default App