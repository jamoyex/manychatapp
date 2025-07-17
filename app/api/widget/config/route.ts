import { NextResponse } from 'next/server'

export async function GET() {
  const webhookUrl = process.env.WIDGET_WEBHOOK_URL

  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'Webhook URL not configured' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    webhookUrl
  })
} 