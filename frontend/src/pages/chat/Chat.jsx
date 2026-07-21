import React, { useEffect, useRef, useState } from 'react'
import './chat.css'
import docImage from './icons/doc-icon.png';
import ReactMarkdown from 'react-markdown'
import {useNavigate, useParams} from 'react-router-dom'
import API_BASE from '../../config'
import authFetch from '../../authFetch'

const Chat = () => {

  const navigate = useNavigate()
  const {chatId} = useParams()
  const [chatHistory,setChatHistory] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const inputBarRef = useRef(null)
  const [inputBarBottom, setInputBarBottom] = useState(0)

  useEffect(()=>{
    const fetchMessages = async() =>{
      try{
        const res = await authFetch(`${API_BASE}/chats/${chatId}/messages`)
        const data = await res.json()
        if (!Array.isArray(data)) {
          console.log("Unexpected response from /messages:", data)
          setChatHistory([])
          return
        }
        const paired = []
        for(let i = 0;i<data.length;i+=2){
          paired.push({
            id: i,
            user: data[i]?.content || "",
            bot: data[i+1]?.content || "",
            source: []
          })
        }
        setChatHistory(paired)
      }catch(err){
        console.log(err)
      }finally{
        setLoadingMessages(false)
      }
    }
    fetchMessages()
  },[chatId])
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory])

  // Visual Viewport API — pins input bar exactly above keyboard on mobile
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const updateBarPosition = () => {
      // bottom offset = how much the keyboard has pushed the viewport up
      const bottom = window.innerHeight - vv.height - vv.offsetTop
      setInputBarBottom(Math.max(0, bottom))
    }

    vv.addEventListener('resize', updateBarPosition)
    vv.addEventListener('scroll', updateBarPosition)
    updateBarPosition()

    return () => {
      vv.removeEventListener('resize', updateBarPosition)
      vv.removeEventListener('scroll', updateBarPosition)
    }
  }, [])

  const [userQuery, setUserquery] = useState('')
  const chatEndRef = React.useRef(null)
  const [recentChats, setRecentChats] = useState([])

  useEffect(() => {
    const fetchRecentChats = async () => {
      try {
        const res = await authFetch(`${API_BASE}/chats`)
        const data = await res.json()
        if (Array.isArray(data)) {
          setRecentChats(data)
        }
      } catch (err) {
        console.log(err)
      }
    }
    fetchRecentChats()
  }, [chatId])

  useEffect(() => {
    const fetchChatInfo = async () => {
      try {
        const res = await authFetch(`${API_BASE}/chats/${chatId}`)
        const data = await res.json()
        if (res.ok) {
          setChatInfo(data)
        }
      } catch (err) {
        console.log(err)
      }
    }
    fetchChatInfo()
  }, [chatId])

  const handleNewChat = async () => {
    try {
      const res = await authFetch(`${API_BASE}/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" })
      })
      const data = await res.json()
      if (!res.ok) {
        console.log("Failed to create chat")
        return
      }
      navigate(`/chat/${data.chat_id}`)
    } catch (err) {
      console.log(err)
    }
  }

  const handleLogout = async () => {
    try {
      const res = await authFetch(`${API_BASE}/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
      if (!res.ok) {
        console.log("Logout failed")
        return
      }
      localStorage.removeItem("access_token")
      navigate("/login")
    } catch (err) {
      console.log(err)
    }
  }

  const handleDeleteChat = async (chatIdToDelete) => {
    const confirmed = window.confirm("Delete this chat? This can't be undone.")
    if (!confirmed) return

    try {
      const res = await authFetch(`${API_BASE}/chats/${chatIdToDelete}`, {
        method: "DELETE"
      })
      if (res.ok) {
        setRecentChats(prev => prev.filter(c => c.chat_id !== chatIdToDelete))
        // If the deleted chat is the current one, go home
        if (chatIdToDelete === chatId) {
          navigate('/')
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  const handleTitleSave = async () => {
    const trimmed = titleInput.trim()
    if (!trimmed || trimmed === chatInfo.title) {
      setEditingTitle(false)
      return
    }

    try {
      const res = await authFetch(`${API_BASE}/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed })
      })
      const data = await res.json()
      if (res.ok) {
        setChatInfo(prev => ({ ...prev, title: data.title }))
        setRecentChats(prev => prev.map(c => c.chat_id === chatId ? { ...c, title: data.title } : c))
      }
    } catch (err) {
      console.log(err)
    } finally {
      setEditingTitle(false)
    }
  }

  const sendMsg = async(userInput) =>{
    const newChat = {
      id: chatHistory.length + 1,
      user: userInput,
      bot: null,
      source: []
    }
    setChatHistory([...chatHistory,newChat])
    setUserquery('')

    const response = await authFetch(`${API_BASE}/chats/${chatId}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: userInput
      }),
    });

    const data = await response.json()
    setChatHistory(prev => prev.map(chat=> {
      if(chat.id === newChat.id){
        return { ...chat, bot: data.answer }
      }
      return chat
    }))
  }

  const [chatInfo, setChatInfo] = useState({ title: "New chat", has_documents: false })
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState("")

  const handleFileChange = (e)=>{
    const selectedFiles = Array.from(e.target.files)
    uploadFiles(selectedFiles)
  }

  const [uploading, setUploading] = useState(false)
  const uploadFiles = async(selectedFiles) =>{
    setUploading(true)
    document.getElementById('inputBox').disabled = true
    document.getElementById('sendBtn').disabled = true
    if(selectedFiles.length==0){
      setUploading(false)
      return
    }

    const formData = new FormData()
    selectedFiles.forEach(file => formData.append('files',file))

    const response = await authFetch(`${API_BASE}/chats/${chatId}/upload`, {
      method:"POST",
      body: formData,
    })
    const data = await response.json()
    console.log(data.message)
    setChatInfo(prev => ({ ...prev, has_documents: true, files: selectedFiles.map(f => f.name) }))
    document.getElementById('inputBox').disabled = false
    document.getElementById('sendBtn').disabled = false
    setUploading(false)
  }



  return ( 
    <div className='mainCont flex relative' style={{height: '100dvh', overflow: 'hidden'}}>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className='fixed inset-0 bg-black/60 z-20 lg:hidden'
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SideBar */}
      <div className={`
        fixed lg:sticky top-0 left-0 z-30
        bg-[#12151B] w-72 lg:w-64 xl:w-72 shrink-0 border-r border-[#262B36] flex flex-col h-screen
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${!sidebarOpen && !sidebarCollapsed ? 'lg:translate-x-0' : ''}
        ${sidebarCollapsed ? 'lg:-translate-x-full lg:w-0 xl:w-0 lg:border-r-0 lg:overflow-hidden' : ''}
      `}>

        <div className='flex items-center gap-3 border-b border-[#262B36] px-4 py-4 cursor-pointer'>  
            <div className="logo w-10 h-10 p-2 shrink-0" onClick={() => navigate('/')}>更</div>
            <div className='flex flex-col items-start flex-1 min-w-0' onClick={() => navigate('/')}>
                <h1 className='text-base font-semibold text-white leading-tight'>Koshin</h1>
                <p className='text-gray-500 text-[11px] leading-tight'>AI grounded in your docs</p>
            </div>
            {/* Close button for mobile */}
            <button
              className='lg:hidden text-gray-500 hover:text-white p-1'
              onClick={() => setSidebarOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
            {/* Collapse button for desktop */}
            <button
              className='hidden lg:block text-gray-500 hover:text-white p-1 transition-colors'
              onClick={() => setSidebarCollapsed(true)}
              title="Collapse sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
        </div>

        <div className='flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1'>
          <button
            className='w-full p-2.5 rounded-lg border border-[#2A2E38] flex items-center gap-2 text-gray-300 font-medium text-sm cursor-pointer hover:bg-[#1a1d26] hover:text-white transition-colors mb-4'
            onClick={() => { handleNewChat(); setSidebarOpen(false) }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
            </svg>
            New Chat
          </button>

          <p className='text-gray-500 text-[11px] font-medium tracking-widest uppercase mb-1 px-2'>Recents</p>

          {recentChats.map(ech => (
            <div
              key={ech.chat_id}
              className={`group px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-1 ${ech.chat_id === chatId ? 'bg-[#1E222B] text-white' : 'hover:bg-[#1a1d26] text-gray-400 hover:text-gray-200'}`}
              onClick={() => { navigate(`/chat/${ech.chat_id}`); setSidebarOpen(false) }}
            >
              <h2 className='text-sm font-normal tracking-wide truncate flex-1 min-w-0'>{ech.title}</h2>
              <button
                className='
                  text-gray-600 hover:text-red-400 transition-all duration-150
                  p-1 rounded-md hover:bg-red-400/10 shrink-0
                  sm:opacity-0 sm:group-hover:opacity-100
                '
                onClick={(e) => { e.stopPropagation(); handleDeleteChat(ech.chat_id) }}
                title="Delete chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>

        <p className='text-[10px] text-gray-700 text-center pb-1 tracking-wide'>
          A <span className='text-gray-600 font-medium'>Zeroprof</span> product
        </p>
        <button onClick={handleLogout} className='text-gray-400 text-sm font-normal tracking-wide cursor-pointer py-4 border-t border-[#262B36] w-full hover:text-white transition-colors'>
          Log out
        </button>

      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0" style={{height: '100dvh', overflow: 'hidden'}}>

        {/* Chat header — shown on all screen sizes, now includes sidebar toggle */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-[#1E222B] w-full bg-[#0B0D11]">
          <div className='flex items-center min-w-0 flex-1 mr-3 gap-3'>
            <button
              className={`text-gray-400 hover:text-white transition-colors p-1 shrink-0 ${sidebarCollapsed ? 'block' : 'lg:hidden'}`}
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setSidebarCollapsed(false)
                } else {
                  setSidebarOpen(true)
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round"/>
              </svg>
            </button>
            <div className='flex flex-col min-w-0'>
              {editingTitle ? (
                <input
                  className='text-sm sm:text-base text-[#e9e9e9] font-medium bg-transparent border-b border-[#d98c4a] outline-none w-full max-w-xs'
                  value={titleInput}
                  autoFocus
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                />
              ) : (
                <h1
                  className='text-sm sm:text-base text-[#e9e9e9] font-medium cursor-pointer hover:underline truncate'
                  onClick={() => { setTitleInput(chatInfo.title); setEditingTitle(true) }}
                >
                  {chatInfo.title}
                </h1>
              )}
              {chatInfo.has_documents && chatInfo.files?.length > 0 && (
                <p className='text-[10px] font-normal tracking-wide text-[#d98c4a] truncate mt-0.5 max-w-[200px] sm:max-w-sm'>{chatInfo.files.join(', ')}</p>
              )}
            </div>
          </div>
          <label className='flex items-center gap-1.5 text-gray-400 text-xs font-medium tracking-wide cursor-pointer hover:text-white transition-colors border border-[#2A2E38] hover:border-[#3A3E48] rounded-lg px-2.5 sm:px-3 py-1.5 shrink-0 whitespace-nowrap'>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input type="file" hidden multiple accept='.pdf' required onChange={handleFileChange}/>
            <span className='hidden sm:inline'>{chatInfo.has_documents ? 'Replace' : 'Attach'} docs</span>
            <span className='sm:hidden'>{chatInfo.has_documents ? 'Replace' : 'Attach'}</span>
          </label>
        </div>

        {/* Chat messages */}
        {chatHistory.length > 0 && (
          <div
            className='flex-1 flex flex-col justify-start px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto max-w-3xl mx-auto w-full'
            style={{ WebkitOverflowScrolling: 'touch', paddingBottom: `calc(80px + ${inputBarBottom}px)` }}
          >
            {chatHistory.map((ech, index) => (
              <div className='flex flex-col mb-6 sm:mb-8' key={index}>
                <p className='bg-[#2A2E38] px-3 sm:px-4 py-2.5 rounded-2xl text-gray-200 text-[13px] sm:text-[14px] self-end mb-4 max-w-[85%] sm:max-w-xl'>{ech.user}</p>
                <div>
                  <div className='text-gray-300 text-[13px] sm:text-[14px] self-start prose prose-invert prose-sm max-w-none leading-relaxed'>
                    {ech.bot === null ? (
                      <div className='flex gap-1.5 py-2'>
                        <span className='w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]'></span>
                        <span className='w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]'></span>
                        <span className='w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce'></span>
                      </div>
                    ) : (
                      <ReactMarkdown>{ech.bot}</ReactMarkdown>
                    )}
                  </div>

                  <div className='flex flex-wrap justify-start gap-2 mt-2'>
                    {ech.source.map((source, index) => (
                      <div key={index} className='flex bg-[#20242E] border-[#262B36] border border-opacity-50 px-3 py-1 rounded-xl'>
                        <p className='text-gray-200 text-[10px] font-medium flex items-center'>
                          <img src={docImage} className="mr-1 text-white h-4 w-4" />
                          {source.file}<span className='ml-1 mr-1 text-gray-500'>p.{source.page}</span> <span className='text-[#d98c4a]'>{source.score}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div ref={chatEndRef} />
              </div>
            ))}
          </div>
        )}

        {chatHistory.length === 0 && uploading === false && (
          <div className='flex-1 flex flex-col justify-center items-center w-full px-6 text-center' style={{paddingBottom: `calc(80px + ${inputBarBottom}px)`}}>
            <h2 className='text-lg sm:text-xl text-[#e9e9e9] font-medium mb-3'>Ask your document anything</h2>
            <p className='text-sm max-w-sm sm:max-w-md font-normal tracking-wide text-gray-500'>Attach a PDF above, then ask a question. Answers are grounded only in what's in the document.</p>
          </div> 
        )}

        {uploading === true && (
          <div className='flex-1 flex flex-col justify-center items-center w-full px-6 text-center' style={{paddingBottom: `calc(80px + ${inputBarBottom}px)`}}>
            <div className='flex gap-1.5 mb-4'>
              <span className='w-2 h-2 bg-[#d98c4a] rounded-full animate-bounce [animation-delay:-0.3s]'></span>
              <span className='w-2 h-2 bg-[#d98c4a] rounded-full animate-bounce [animation-delay:-0.15s]'></span>
              <span className='w-2 h-2 bg-[#d98c4a] rounded-full animate-bounce'></span>
            </div>
            <h2 className='text-lg sm:text-xl text-[#e9e9e9] font-medium mb-2'>Uploading files...</h2>
            <p className='text-sm font-normal tracking-wide text-gray-500'>Please wait while we process your documents.</p>
          </div>
        )}
        
        {/* Footer input — sticky at bottom of chat area, centered within content */}
        <div
          ref={inputBarRef}
          className='flex w-full justify-center px-4 sm:px-6 bg-[#0B0D11] shrink-0'
          style={{
            paddingTop: '10px',
            paddingBottom: `calc(10px + env(safe-area-inset-bottom))`,
            marginBottom: inputBarBottom > 0 ? inputBarBottom : 0,
            transition: 'margin-bottom 0.05s ease-out',
          }}
        >
          <div className='flex items-center gap-2 w-full max-w-3xl bg-[#171A21] border border-[#2A2E38] rounded-2xl px-4 py-1 shadow-xl transition-colors focus-within:border-[#3A3E48]'>
            <input
              id='inputBox'
              type="text"
              className='flex-1 bg-transparent outline-none text-gray-200 text-sm placeholder-gray-500 py-2.5 leading-normal min-w-0'
              placeholder='Message Koshin...'
              onChange={(e)=> setUserquery(e.target.value)}
              value={userQuery}
              onKeyDown={(e)=> e.key === 'Enter' && userQuery.trim() && sendMsg(userQuery)}
            />
            <button
              id='sendBtn'
              disabled={!userQuery.trim()}
              className='bg-[#d98c4a] disabled:bg-[#2a2d35] disabled:cursor-not-allowed w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors shrink-0'
              onClick={()=> userQuery.trim() && sendMsg(userQuery)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

export default Chat