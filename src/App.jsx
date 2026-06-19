import { useState } from 'react'
import { useGame } from './state/useGame'
import { sound } from './audio/sound'
import SetupScreen from './components/SetupScreen'
import Board from './components/Board'
import PlayerPanel from './components/PlayerPanel'
import DicePanel from './components/DicePanel'
import StationModal from './components/StationModal'
import MiniGameModal from './components/MiniGameModal'
import GameOverScreen from './components/GameOverScreen'

export default function App() {
  const g = useGame()
  const [muted, setMuted] = useState(sound.isMuted())

  const toggleMute = () => {
    const m = sound.toggleMuted()
    setMuted(m)
    if (!m && g.phase !== 'setup' && g.phase !== 'gameover') sound.startBgm() // 取消靜音時恢復背景音樂
  }

  if (g.phase === 'setup') {
    return <SetupScreen journeys={g.journeys} onStart={g.startGame} />
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">{g.journey.title}</h1>
        <span className="app__subtitle">{g.journey.subtitle}</span>
        <button
          className="app__mute"
          onClick={toggleMute}
          title={muted ? '開啟音效' : '關閉音效'}
          aria-label={muted ? '開啟音效' : '關閉音效'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </header>

      <main className="app__main">
        <section className="app__board">
          <Board
            stations={g.journey.stations}
            players={g.game.players}
            currentPlayerId={g.currentPlayer?.id}
            pendingStationId={g.game.pendingStationId}
            map={g.map}
          />
        </section>

        <aside className="app__side">
          <PlayerPanel
            players={g.game.players}
            currentPlayerId={g.currentPlayer?.id}
            scoreLabel={g.journey.scoreLabel}
            journey={g.journey}
          />
          <DicePanel
            phase={g.phase}
            diceFace={g.diceFace}
            currentPlayer={g.currentPlayer}
            onRoll={g.rollAndMove}
          />
        </aside>
      </main>

      {/* 闖關挑戰站：在「停留」階段先玩小遊戲，結束後把勝負送進結算。 */}
      {g.phase === 'station' && g.currentStation?.minigame && (
        <MiniGameModal
          minigame={g.currentStation.minigame}
          onComplete={(r) => g.resolveStation({ minigameWon: r.won, minigameScore: r.score })}
        />
      )}

      {/* 其餘停留 / 結算（含挑戰站結算後的結果）走一般彈窗。 */}
      {((g.phase === 'station' && !g.currentStation?.minigame) || g.phase === 'result') &&
        g.currentStation && (
          <StationModal
            station={g.currentStation}
            quiz={g.currentQuiz}
            card={g.currentCard}
            phase={g.phase}
            result={g.game.lastResult}
            scoreLabel={g.journey.scoreLabel}
            currentPlayer={g.currentPlayer}
            moveNote={g.game.moveNote}
            onResolve={g.resolveStation}
            onFinish={g.finishTurn}
          />
        )}

      {g.phase === 'gameover' && (
        <GameOverScreen
          status={g.status}
          scoreLabel={g.journey.scoreLabel}
          journey={g.journey}
          nextJourney={g.nextJourney}
          onRestart={g.restart}
          onContinue={g.continueJourney}
        />
      )}
    </div>
  )
}
