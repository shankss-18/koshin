import React, { useState } from 'react'
import "./signup.css"
import { useNavigate } from 'react-router-dom'
import API_BASE from '../../config'

const Signup = () => {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignUp = async(e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try{
      const res = await fetch(`${API_BASE}/register`, {
        method:"POST",
        headers:{
          "Content-Type": "application/json"
        },
        credentials:'include',
        body: JSON.stringify({
          name,
          email,
          password
        })
      })
      const data = await res.json()
      if(!res.ok){
        setError(data.error || "Signup failed")
        return
      }
      navigate("/login")
    }catch(err){
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex justify-center items-center min-h-screen mainCont px-4 py-10'>
      <div className='w-full max-w-sm'>

        {/* Brand header */}
        <div className='flex justify-center items-center gap-3 mb-8'>
          <div className="logo w-12 h-12 p-2 shrink-0">更</div>
          <div className='flex flex-col items-start'>
            <h1 className='brand-title'>Kōshin</h1>
            <p className='brand-sub'>AI support, grounded in your docs</p>
          </div>
        </div>

        {/* Form card */}
        <form className="form-card" onSubmit={handleSignUp}>

          <h2 className='form-heading'>Create your account</h2>
          <p className='form-sub'>Upload your docs, get an AI agent in minutes.</p>

          <div className="field-group">
            <label className='field-label' htmlFor="name">Name</label>
            <input
              className='field-input'
              placeholder='Your Name'
              type="text"
              name="name"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label className='field-label' htmlFor="email">Email</label>
            <input
              className='field-input'
              placeholder='your@email.com'
              type="email"
              name="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label className='field-label' htmlFor="password">Password</label>
            <input
              className='field-input'
              placeholder='At least 8 characters'
              type="password"
              name="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className='error-box'>
              <span>{error}</span>
            </div>
          )}

          <button
            type='submit'
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

        </form>

        <p className='text-xs text-gray-500 text-center mt-5'>
          Already have an account?{' '}
          <span
            className='text-[#D98C4A] cursor-pointer hover:underline'
            onClick={() => navigate("/login")}
          >
            Log in
          </span>
        </p>

        <p className='text-[11px] text-gray-700 text-center mt-6 tracking-wide'>
          A <span className='text-gray-500 font-medium'>Zeroprof</span> product
        </p>

      </div>
    </div>
  )
}

export default Signup