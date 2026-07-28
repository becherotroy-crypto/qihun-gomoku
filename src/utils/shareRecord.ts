import type { GameRecord } from '../types'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const SIZE = 1200
const BOARD_LEFT = 92
const BOARD_TOP = 270
const BOARD_SIZE = 1016

function drawWood(ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createLinearGradient(0, BOARD_TOP, SIZE, BOARD_TOP + BOARD_SIZE)
  gradient.addColorStop(0, '#c59254')
  gradient.addColorStop(0.45, '#b47b3f')
  gradient.addColorStop(1, '#8f5a2e')
  ctx.fillStyle = gradient
  ctx.fillRect(BOARD_LEFT, BOARD_TOP, BOARD_SIZE, BOARD_SIZE)
  ctx.globalAlpha = 0.09
  for (let y = BOARD_TOP + 8; y < BOARD_TOP + BOARD_SIZE; y += 14) {
    ctx.beginPath()
    ctx.moveTo(BOARD_LEFT, y)
    for (let x = BOARD_LEFT; x <= BOARD_LEFT + BOARD_SIZE; x += 28) {
      ctx.lineTo(x, y + Math.sin(x * 0.025 + y) * 3)
    }
    ctx.strokeStyle = y % 42 === 0 ? '#2b160b' : '#f5d599'
    ctx.lineWidth = 1.2
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function drawStone(ctx: CanvasRenderingContext2D, x: number, y: number, color: 'black' | 'white') {
  const radius = 29
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,.4)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 7
  const gradient = ctx.createRadialGradient(x - 10, y - 13, 2, x, y, radius)
  if (color === 'black') {
    gradient.addColorStop(0, '#777c7b')
    gradient.addColorStop(0.23, '#242827')
    gradient.addColorStop(1, '#050606')
  } else {
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.3, '#f1eee8')
    gradient.addColorStop(1, '#bab8b2')
  }
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export async function createRecordImage(record: GameRecord): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = 1450
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#101313'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#caa66d'
  ctx.font = '500 28px system-ui, sans-serif'
  ctx.fillText('棋魂', 88, 92)
  ctx.fillStyle = '#f3f1eb'
  ctx.font = '700 58px system-ui, sans-serif'
  ctx.fillText('五子棋 · 对局棋谱', 88, 158)
  ctx.fillStyle = '#919997'
  ctx.font = '400 25px system-ui, sans-serif'
  ctx.fillText(`${record.opponent} · ${record.moves.length} 手 · ${new Date(record.date).toLocaleDateString('zh-CN')}`, 88, 210)

  drawWood(ctx)
  const gridStart = BOARD_LEFT + 49
  const gridTop = BOARD_TOP + 49
  const gap = (BOARD_SIZE - 98) / 14
  ctx.strokeStyle = 'rgba(56,34,16,.72)'
  ctx.lineWidth = 2
  for (let index = 0; index < 15; index += 1) {
    const offset = index * gap
    ctx.beginPath(); ctx.moveTo(gridStart + offset, gridTop); ctx.lineTo(gridStart + offset, gridTop + gap * 14); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(gridStart, gridTop + offset); ctx.lineTo(gridStart + gap * 14, gridTop + offset); ctx.stroke()
  }
  record.moves.forEach((move) => drawStone(ctx, gridStart + move.col * gap, gridTop + move.row * gap, move.player))

  ctx.fillStyle = '#f3f1eb'
  ctx.font = '600 30px system-ui, sans-serif'
  const result = record.result === 'draw' ? '和棋' : record.result === record.playerColor ? '胜局' : '败局'
  ctx.fillText(`${result}  ·  ${Math.max(1, Math.round(record.duration / 60))} 分钟`, 88, 1360)
  ctx.fillStyle = '#8f9694'
  ctx.font = '400 22px system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('落子无悔 · 方寸见心', 1112, 1360)

  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('图片生成失败')), 'image/png', 0.96))
}

export async function shareRecord(record: GameRecord) {
  const blob = await createRecordImage(record)
  const file = new File([blob], `棋魂棋谱-${record.id}.png`, { type: 'image/png' })
  if (Capacitor.isNativePlatform()) {
    const data = await blobToBase64(blob)
    const path = `shared/${file.name}`
    await Filesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true })
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache })
    await Share.share({
      title: '棋魂五子棋 · 对局棋谱',
      text: `与 ${record.opponent} 的 ${record.moves.length} 手对局`,
      files: [uri],
      dialogTitle: '分享棋谱',
    })
    return
  }
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title: '棋魂五子棋 · 对局棋谱', text: `与 ${record.opponent} 的 ${record.moves.length} 手对局`, files: [file] })
    return
  }
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.name
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}
