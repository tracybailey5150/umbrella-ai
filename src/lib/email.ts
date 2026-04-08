import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY!)

const FROM = 'Umbrella AI <noreply@umbrella-ai.com>'

export async function sendFollowUpReminder(to: string, leadName: string, dueAt: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Follow-up reminder: ${leadName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:10px">
        <div style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:8px">Follow-Up Reminder</div>
        <p style="color:#475569;font-size:14px;margin-bottom:16px">You have a follow-up scheduled with <strong>${leadName}</strong> due ${new Date(dueAt).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/leads" style="display:inline-block;padding:10px 20px;background:#6366F1;color:#fff;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px">View Lead →</a>
      </div>
    `,
  })
}

export async function sendBuyerAgentMatch(to: string, agentName: string, leadName: string, matchScore: number, reasons: string[]) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Buyer Agent match found: ${leadName} (${matchScore}% match)`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:10px">
        <div style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:8px">Buyer Agent Match Found</div>
        <p style="color:#475569;font-size:14px;margin-bottom:4px">Your buyer agent <strong>${agentName}</strong> found a potential match:</p>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
          <div style="font-size:16px;font-weight:700;color:#1e293b;margin-bottom:4px">${leadName}</div>
          <div style="font-size:13px;color:#6366F1;font-weight:600;margin-bottom:12px">${matchScore}% match score</div>
          <ul style="margin:0;padding-left:20px;color:#475569;font-size:13px">
            ${reasons.map(r => `<li style="margin-bottom:4px">${r}</li>`).join('')}
          </ul>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/leads" style="display:inline-block;padding:10px 20px;background:#6366F1;color:#fff;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px">Review Match →</a>
      </div>
    `,
  })
}

export async function sendPriceAlert(to: string, itemName: string, category: string, changePct: number, newPrice: number, unit: string) {
  const dir = changePct > 0 ? 'increased' : 'decreased'
  const color = changePct > 0 ? '#EF4444' : '#10B981'
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Price Alert: ${itemName} ${dir} ${Math.abs(changePct).toFixed(1)}%`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:10px">
        <div style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:8px">Supply Price Alert</div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
          <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:4px">${itemName}</div>
          <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;margin-bottom:8px">${category.replace(/_/g,' ')}</div>
          <div style="font-size:24px;font-weight:800;color:${color}">${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}%</div>
          <div style="font-size:13px;color:#475569;margin-top:4px">Now: $${newPrice.toFixed(2)} ${unit}</div>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/supply-watch" style="display:inline-block;padding:10px 20px;background:#6366F1;color:#fff;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px">View Price Watch →</a>
      </div>
    `,
  })
}

export async function sendWelcome(to: string, orgName: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Welcome to Umbrella AI — ${orgName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:10px">
        <div style="font-size:24px;font-weight:800;color:#6366F1;margin-bottom:8px">Welcome to Umbrella AI</div>
        <p style="color:#475569;font-size:14px;margin-bottom:16px">Your workspace <strong>${orgName}</strong> is ready. Start by creating your first intake agent to capture leads, or explore the buyer agent and market intelligence tools.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;padding:10px 20px;background:#6366F1;color:#fff;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px">Go to Dashboard →</a>
      </div>
    `,
  })
}
