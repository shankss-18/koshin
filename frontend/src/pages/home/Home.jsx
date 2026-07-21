import React, {useState, useEffect} from 'react'
import './home.css'
import { useNavigate } from 'react-router-dom';
import API_BASE from '../../config'
import authFetch from '../../authFetch'

const Home = () => {

    const navigate = useNavigate()
    const [recentChats, setRecentChats] = useState([])
    const [loadingChats, setLoadingChats] = useState(true)

    useEffect(()=>{
        const fetchChats = async()=>{
            try{
                const res = await authFetch(`${API_BASE}/chats`)
                const data = await res.json()
                setRecentChats(data)
            }catch(err){
                console.log(err)
            }finally{
                setLoadingChats(false)
            }
        }
        fetchChats()
    }, [])

    const handleLogout = async()=>{
        try {
            const res = await authFetch(`${API_BASE}/logout`,{
                method:"POST",
                headers:{
                    "Content-Type": "application/json"
                }
            })
            const data = await res.json()
            if(!res.ok){
                console.log("Logout failed")
                return
            }
            localStorage.removeItem("access_token")
            navigate("/login")
        } catch (err) {
            console.log(err)
        }
    }

    const handleNewChat = async()=>{
        try{
            const res = await authFetch(`${API_BASE}/chats`, {
                method:"POST",
                headers:{
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({title: "New Chat"})
            })
            const data = await res.json()
            if(!res.ok){
                console.log("Failed to create chat")
                return
            }
            navigate(`/chat/${data.chat_id}`)

        }catch(err){
            console.log(err)
        }
    }

    const handleDeleteChat = async (chatId) => {
        const confirmed = window.confirm("Delete this chat? This can't be undone.")
        if (!confirmed) return

        try {
            const res = await authFetch(`${API_BASE}/chats/${chatId}`, {
                method: "DELETE"
            })
            if (res.ok) {
                setRecentChats(prev => prev.filter(c => c.chat_id !== chatId))
            }
        } catch (err) {
            console.log(err)
        }
    }


    return (
        <div className='min-h-screen mainCont'>

            {/* Navbar */}
            <div className="navBar flex justify-between items-center px-4 sm:px-8 py-0 h-[68px] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] relative z-10">
                <div className='flex items-center gap-3'>
                    <div className="logo w-11 h-11 p-2 shrink-0">更</div>
                    <div className='flex flex-col items-start'>
                        <h1 className='text-base sm:text-lg font-semibold text-white leading-tight'>Koshin</h1>
                        <p className='text-gray-500 text-[11px] leading-tight hidden sm:block'>AI support, grounded in your docs</p>
                    </div>
                </div>
                <button
                    className='text-xs sm:text-sm text-gray-400 cursor-pointer hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5'
                    onClick={handleLogout}
                >
                    Log out
                </button>
            </div>

            {/* Body */}
            <div className="bodyDiv px-4 sm:px-6 py-8 w-full max-w-2xl mx-auto">

                <h1 className='text-2xl sm:text-3xl text-[#e9e9e9] font-normal'>Your conversations</h1>
                <p className='text-gray-500 text-sm mt-2 font-normal tracking-wide'>Pick up where you left off, or start something new.</p>

                {/* New Chat card */}
                <div
                    className='flex items-center gap-4 p-5 sm:p-6 w-full rounded-2xl bg-[#12151B] border border-[#2A2E38] mt-8 cursor-pointer hover:border-[#d98c4a] hover:bg-[#151821] transition-all duration-200'
                    onClick={handleNewChat}
                >
                    <div className='w-11 h-11 sm:w-12 sm:h-12 text-[#e8a05f] bg-[#1e1814] text-2xl rounded-full border border-[#8a5a32] flex items-center justify-center shrink-0'>
                        +
                    </div>
                    <div>
                        <h2 className='text-[#e9e9e9] text-sm sm:text-base font-medium'>Start a new chat</h2>
                        <p className='text-gray-500 text-xs sm:text-sm font-light tracking-wide mt-0.5'>Upload documents and ask it anything.</p>
                    </div>
                </div>

                {/* Recent chats */}
                <p className='text-gray-500 text-[11px] font-medium tracking-widest uppercase mt-8 mb-3'>Recent chats</p>

                {loadingChats && (
                    <div className='flex items-center gap-2 py-4'>
                        <span className='w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]'></span>
                        <span className='w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]'></span>
                        <span className='w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce'></span>
                    </div>
                )}

                {!loadingChats && recentChats.length === 0 && (
                    <p className='text-gray-500 text-sm py-4'>No chats yet. Start a new one above.</p>
                )}

                <div className='flex flex-col gap-2'>
                    {recentChats.map(ech => (
                        <div
                            key={ech.chat_id}
                            className='group flex justify-between items-center p-4 sm:p-5 w-full rounded-2xl bg-[#12151B] border border-[#2A2E38] cursor-pointer hover:border-[#3A3E48] hover:bg-[#151821] transition-all duration-200'
                            onClick={() => navigate(`/chat/${ech.chat_id}`)}
                        >
                            <h2 className='text-[#e9e9e9] text-sm font-medium truncate pr-3'>{ech.title}</h2>
                            <button
                                className='
                                    text-gray-500 text-xs hover:text-red-400
                                    transition-all duration-150 px-2 py-1 rounded-md hover:bg-red-400/10 shrink-0
                                    sm:opacity-0 sm:group-hover:opacity-100
                                '
                                onClick={(e) => { e.stopPropagation(); handleDeleteChat(ech.chat_id) }}
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>

            </div>

            {/* Footer branding */}
            <div className='py-6 text-center'>
                <p className='text-[11px] text-gray-700 tracking-wide'>
                    Koshin &mdash; by{' '}
                    <span className='text-gray-500 font-medium'>Zeroprof</span>
                </p>
            </div>

        </div>
    )
}

export default Home