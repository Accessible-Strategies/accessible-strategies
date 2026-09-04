'use client';

import { useState } from 'react';

type Reason = 'general' | 'issue' | 'work' | 'tech';

const reasons: { value: Reason; label: string; blurb: string }[] = [
  { value: 'general', label: 'General Inquiry', blurb: 'Have a question, comment, or just want to get in touch? Start here.' },
  { value: 'issue',   label: 'Report an Issue',  blurb: 'Ran into an accessibility barrier on this site? Let us know what happened.' },
  { value: 'work',    label: 'Work Request',     blurb: 'Looking to hire us for an audit, remediation, or consulting.' },
  { value: 'tech',    label: 'Tech Question',    blurb: 'Running into a specific accessibility or technical issue? Tell us your platform or tools so we can help.' },
];

export default function ContactForm() {
  const [reason, setReason]   = useState<Reason>('general');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [message, setMessage] = useState('');

  // Report an Issue
  const [pageUrl, setPageUrl]             = useState('');
  const [assistiveTech, setAssistiveTech] = useState('');

  // Tech Question
  const [question, setQuestion] = useState('');
  const [platform, setPlatform] = useState('');

  // Work Request — Accessible Strategies intake form
  const [orgAbout, setOrgAbout]                     = useState(''); // Q1
  const [targetAudience, setTargetAudience]         = useState(''); // Q2
  const [accessibilityMeaning, setAccessibilityMeaning] = useState(''); // Q3
  const [prompt, setPrompt]                         = useState(''); // Q4
  const [pastImprovements, setPastImprovements]     = useState(''); // Q5
  const [teamInvolved, setTeamInvolved]             = useState(''); // Q6
  const [platformAccess, setPlatformAccess]         = useState(''); // Q7
  const [siteUrl, setSiteUrl]                       = useState(''); // URL to review
  const [confirmFeesTimelines, setConfirmFeesTimelines] = useState(false); // Q8
  const [commsAgreement, setCommsAgreement]         = useState(false); // Q9
  const [anythingElse, setAnythingElse]             = useState(''); // Q10

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const reasonLabel = reasons.find(r => r.value === reason)?.label ?? '';
    let body = `Reason: ${reasonLabel}\nName: ${name}\nEmail: ${email}\n\n`;

    if (reason === 'general') {
      body += `Message:\n${message}`;
    } else if (reason === 'issue') {
      body += `Page/URL: ${pageUrl}\nAssistive technology used: ${assistiveTech}\n\nWhat happened:\n${message}`;
    } else if (reason === 'tech') {
      body += `Platform/tool: ${platform}\n\nQuestion:\n${question}`;
    } else if (reason === 'work') {
      body += `1. About your organization:\n${orgAbout}\n\n`;
      body += `2. Who you're trying to reach:\n${targetAudience}\n\n`;
      body += `3. What accessibility/inclusion means in practice:\n${accessibilityMeaning}\n\n`;
      body += `4. What's prompting this:\n${prompt}\n\n`;
      body += `5. Past accessibility improvements:\n${pastImprovements}\n\n`;
      body += `6. Team involved in implementation:\n${teamInvolved}\n\n`;
      body += `7. Platform and access:\n${platformAccess}\n\n`;
      body += `Site/document URL: ${siteUrl}\n\n`;
      body += `8. Reviewed services and fees: ${confirmFeesTimelines ? 'Yes' : 'No'}\n`;
      body += `9. Email communication / recorded calls agreement: ${commsAgreement ? 'Yes' : 'No'}\n\n`;
      body += `10. Anything else:\n${anythingElse}`;
    }

    const subject = encodeURIComponent(`[AS Contact] ${reasonLabel}`);
    const mailto   = `mailto:Mark@AccessibleStrategies.com?subject=${subject}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }

  return (
    <form onSubmit={handleSubmit} className="contact-form">

      {/* Reason selector */}
      <fieldset className="contact-form__reason">
        <legend className="settings-row__label">What best describes why you're reaching out?</legend>
        <div className="reason-list" role="radiogroup" aria-label="Reason for contacting">
          {reasons.map(r => (
            <label
              key={r.value}
              className={`reason-option${reason === r.value ? ' reason-option--active' : ''}`}
            >
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="sr-only"
              />
              <span className="reason-option__label">{r.label}</span>
              <span className="reason-option__blurb">{r.blurb}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Shared fields */}
      <div className="form-row">
        <label htmlFor="name" className="form-label">Name</label>
        <input id="name" type="text" required value={name} onChange={e => setName(e.target.value)} className="form-input" />
      </div>

      <div className="form-row">
        <label htmlFor="email" className="form-label">Email</label>
        <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="form-input" />
      </div>

      {/* Dynamic fields — announced to screen readers without moving focus */}
      <div aria-live="polite">

        {reason === 'general' && (
          <div className="form-row">
            <label htmlFor="message" className="form-label">Message</label>
            <textarea id="message" required rows={5} value={message} onChange={e => setMessage(e.target.value)} className="form-input" />
          </div>
        )}

        {reason === 'issue' && (
          <>
            <div className="form-row">
              <label htmlFor="pageUrl" className="form-label">Page or URL where the issue occurred</label>
              <input id="pageUrl" type="text" value={pageUrl} onChange={e => setPageUrl(e.target.value)} className="form-input" />
            </div>
            <div className="form-row">
              <label htmlFor="message" className="form-label">What happened</label>
              <textarea id="message" required rows={5} value={message} onChange={e => setMessage(e.target.value)} className="form-input" />
            </div>
            <div className="form-row">
              <label htmlFor="assistiveTech" className="form-label">Assistive technology used (optional)</label>
              <input id="assistiveTech" type="text" value={assistiveTech} onChange={e => setAssistiveTech(e.target.value)} className="form-input" placeholder="e.g. NVDA, VoiceOver, switch control" />
            </div>
          </>
        )}

        {reason === 'tech' && (
          <>
            <div className="form-row">
              <label htmlFor="platform" className="form-label">Platform or tool</label>
              <input id="platform" type="text" value={platform} onChange={e => setPlatform(e.target.value)} className="form-input" placeholder="e.g. WordPress, Squarespace, custom-built" />
            </div>
            <div className="form-row">
              <label htmlFor="question" className="form-label">Your question</label>
              <textarea id="question" required rows={5} value={question} onChange={e => setQuestion(e.target.value)} className="form-input" />
            </div>
          </>
        )}

        {reason === 'work' && (
          <>
            <p className="form-section-note">
              This form is reviewed personally before any discovery call is offered.
              Submitting this form does not guarantee an engagement — it begins a conversation.
            </p>

            <h3 className="form-section-heading">About You & Your Organization</h3>

            <div className="form-row">
              <label htmlFor="orgAbout" className="form-label">Tell us about your organization and what you do</label>
              <textarea id="orgAbout" required rows={4} value={orgAbout} onChange={e => setOrgAbout(e.target.value)} className="form-input" />
            </div>

            <div className="form-row">
              <label htmlFor="targetAudience" className="form-label">Who are you trying to reach with your website?</label>
              <textarea id="targetAudience" required rows={3} value={targetAudience} onChange={e => setTargetAudience(e.target.value)} className="form-input" />
            </div>

            <div className="form-row">
              <label htmlFor="accessibilityMeaning" className="form-label">What does accessibility and inclusion mean to your organization in practice?</label>
              <textarea id="accessibilityMeaning" required rows={4} value={accessibilityMeaning} onChange={e => setAccessibilityMeaning(e.target.value)} className="form-input" />
            </div>

            <h3 className="form-section-heading">About the Engagement</h3>

            <div className="form-row">
              <label htmlFor="prompt" className="form-label">What's prompting you to look into accessibility?</label>
              <textarea id="prompt" required rows={3} value={prompt} onChange={e => setPrompt(e.target.value)} className="form-input" />
            </div>

            <div className="form-row">
              <label htmlFor="pastImprovements" className="form-label">Have you made any accessibility improvements before? If so, what happened?</label>
              <textarea id="pastImprovements" required rows={3} value={pastImprovements} onChange={e => setPastImprovements(e.target.value)} className="form-input" />
            </div>

            <div className="form-row">
              <label htmlFor="teamInvolved" className="form-label">Who on your team will be involved in implementing accessibility improvements?</label>
              <textarea id="teamInvolved" required rows={3} value={teamInvolved} onChange={e => setTeamInvolved(e.target.value)} className="form-input" />
            </div>

            <div className="form-row">
              <label htmlFor="platformAccess" className="form-label">What platform is your website built on, and do you have access to make changes?</label>
              <textarea id="platformAccess" required rows={3} value={platformAccess} onChange={e => setPlatformAccess(e.target.value)} className="form-input" />
            </div>

            <div className="form-row">
              <label htmlFor="siteUrl" className="form-label">Site or document URL you'd like us to review</label>
              <input id="siteUrl" type="text" required value={siteUrl} onChange={e => setSiteUrl(e.target.value)} className="form-input" />
            </div>

            <h3 className="form-section-heading">Practical Matters</h3>

            <div className="form-row form-row--checkbox">
              <label className="form-checkbox-label">
                <input type="checkbox" required checked={confirmFeesTimelines} onChange={e => setConfirmFeesTimelines(e.target.checked)} />
                I have reviewed the services and fee structure on this site and understand the timelines involved.
              </label>
            </div>

            <div className="form-row form-row--checkbox">
              <label className="form-checkbox-label">
                <input type="checkbox" required checked={commsAgreement} onChange={e => setCommsAgreement(e.target.checked)} />
                Primary communication for this engagement is via email. Discovery calls are recorded with your consent. I understand and agree.
              </label>
            </div>

            <h3 className="form-section-heading">Anything Else?</h3>

            <div className="form-row">
              <label htmlFor="anythingElse" className="form-label">Is there anything else you'd like us to know? (optional)</label>
              <textarea id="anythingElse" rows={4} value={anythingElse} onChange={e => setAnythingElse(e.target.value)} className="form-input" />
            </div>
          </>
        )}

      </div>

      <button type="submit" className="btn btn--primary">Send message</button>
    </form>
  );
}