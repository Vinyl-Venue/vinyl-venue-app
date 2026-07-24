import { useState, useEffect } from 'react'

function getTimeRemaining(endsAt) {
  const total = new Date(endsAt).getTime() - new Date().getTime()

  if (total <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  const days = Math.floor(total / (1000 * 60 * 60 * 24))
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((total / (1000 * 60)) % 60)
  const seconds = Math.floor((total / 1000) % 60)

  return { total, days, hours, minutes, seconds }
}

function pad(number) {
  return String(number).padStart(2, '0')
}

function AuctionCountdown({ endsAt }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeRemaining(endsAt))

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeLeft(getTimeRemaining(endsAt))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [endsAt])

  if (timeLeft.total <= 0) {
    return <span className="auction-ended">Auction ended</span>
  }

  return (
    <span className="auction-countdown">
      {timeLeft.days}d {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
    </span>
  )
}

export default AuctionCountdown