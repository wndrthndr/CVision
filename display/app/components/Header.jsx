import React from 'react'

function Header() {
  return (
    <div className='flex-row items-center justify-center text-5xl pt-12'>
       <h1 className="text-5xl font-bold flex items-center justify-center">
       <span className='bg-gradient-to-r from-orange-500 via-yellow-200 to-white bg-clip-text text-transparent text-[55px] bungee-inline-regular'>CV</span>
        <span className="font-normal text-[42px] text-white syncopate-regular"> ision</span>
      </h1>
      <p className="text-sm mt-3 text-gray-500 text-center font-futuristic">Make your resume stand out</p>
      
      {/* Moving dots animation */}
      <div className="w-full absolute top-14 h-24 mt-4 z-99">
        <div className="dot dot-1"></div>
        <div className="dot dot-2"></div>
        <div className="dot dot-3"></div>
      </div>
    </div>
  )
}

export default Header
