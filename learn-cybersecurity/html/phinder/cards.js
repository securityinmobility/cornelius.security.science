/* Phinder: the messages and red-flag labels.
   Used by the page (window.PHINDER) and by the online server (require). */
(function (root) {
  'use strict';
  /* messages
     Scenarios inspired by TUM's list of real phishing mails, adapted to THI.
     Phishing domains are made up (.example). [[text]] marks a warning sign;
     it is highlighted on the card after the answer. */
  var CARDS = [
    // inspired by "Mailbox Quota Exceeded!"
    { kind: 'Email', phish: true, from: 'THI IT-Service', addr: 'support@[[thi-mailservice.example]]',
      subject: 'Mailbox Quota Exceeded!', body: '[[Dear user]], your mailbox is at 99%. [[Upgrade within 24 hours]] or incoming mails will be deleted.',
      link: 'Upgrade mailbox', url: '[[thi-mailservice.example]]/owa',
      flags: ['sender', 'greeting', 'urgency', 'threat', 'link'],
      why: ['Sender is not @thi.de', '"Dear user": they don\'t know your name', 'Pressure: 24 hours'] },
    // inspired by "Library Notification" (correct-looking sender, cloned login page)
    { kind: 'Email', phish: true, from: 'THI Library', addr: 'bibliothek@thi.de',
      subject: 'Your library account expires', body: 'Your library account expires today. [[Sign in with your THI account]] to keep access.',
      link: 'Sign in', url: 'thi.de.[[login-portal.example]]/library',
      flags: ['spoofed', 'link', 'data'],
      why: ['The sender looks right, but senders can be faked', 'The link goes to login-portal.example', 'Fake THI login page steals your password'] },
    // inspired by "IT Help Desk"
    { kind: 'Email', phish: true, from: 'THI Help Desk', addr: 'helpdesk.thi@[[freemail.example]]',
      subject: 'Password expires in 2 days', body: 'To keep your account, [[reply with your username and password]].',
      flags: ['sender', 'data', 'urgency'],
      why: ['IT never asks for your password', 'Private email address', 'Deadline: 2 days'] },
    // inspired by the blackmail mails (sextortion)
    { kind: 'Email', phish: true, from: 'You', addr: '[[you@thi.de]]',
      subject: 'I hacked your device', body: 'I have your passwords and your webcam. [[Pay €499 in Bitcoin within 48 hours]] or I send everything to your contacts.',
      flags: ['spoofed', 'threat', 'urgency', 'money'],
      why: ['Sent "from yourself": the sender is faked', 'Threat + Bitcoin + deadline', 'Bluff. Don\'t answer, don\'t pay.'] },
    // inspired by the invoice / debt-collection mails with .zip/.doc attachments
    { kind: 'Email', phish: true, from: 'Inkasso Knurzbichler', addr: 'office@[[inkasso-knurzbichler.example]]',
      context: 'You did not order anything.',
      subject: 'Unpaid invoice: €92.69', body: 'You did not pay your order. [[Pay today]] to avoid extra costs. Details in the attachment.',
      attach: '[[Invoice_73889.zip]]',
      flags: ['unexpected', 'attachment', 'urgency', 'sender'],
      why: ['Invoice for something you never ordered', 'Zip attachment can hide malware', 'Pressure: pay today'] },
    // inspired by "Complete tum.de Survey Now (Important)"
    { kind: 'Email', phish: true, from: 'HR Department, THI', addr: 'survey@[[thi-staff.example]]',
      subject: 'Complete thi.de Survey Now (Important)', body: 'All students and staff must complete the survey. [[Log in with your THI account]] to start.',
      link: 'Start survey', url: '[[thi-staff.example]]/survey',
      flags: ['sender', 'data', 'urgency', 'link'],
      why: ['Sender is not @thi.de', 'A survey does not need your password', '"Important" in the subject = pressure'] },
    // inspired by the prize mails (fake award letters from big companies)
    { kind: 'Email', phish: true, from: 'Global Email Lottery', addr: 'awards@[[mail-lottery.example]]',
      context: 'You never entered a lottery.',
      subject: 'Congratulations! You won €750,000', body: 'Your email was selected. [[Send your name, address and bank details]] to claim your prize.',
      flags: ['tooGood', 'unexpected', 'data'],
      why: ['Too good to be true', 'You never took part', 'Asks for personal and bank data'] },
    { kind: 'SMS', phish: true, from: '+44 7700 900123', addr: '',
      context: 'You are not expecting a parcel.',
      body: 'QuickParcel: Your parcel could not be delivered. [[Pay a €1.99 fee]] to get it: [[quickparcel-fee.example/pay]]',
      flags: ['channel', 'unexpected', 'money', 'link'],
      why: ['Unknown number', 'Small payment to steal card details', 'Strange link'] },
    { kind: 'SMS', phish: true, from: '[[Unknown number]]', addr: '',
      body: 'Hi Mum, my phone broke, this is my new number. [[Can you send me money today?]] I\'ll explain later.',
      flags: ['channel', 'urgency', 'money'],
      why: ['New number, no name', 'Money, right now', 'Call your child on the old number to check'] },
    { kind: 'Email', phish: true, from: 'Prof. Plümpelmoser', addr: 'pluempelmoser.thi@[[freemail.example]]',
      subject: 'Quick favour', body: 'Are you on campus? I need you to [[buy 4 gift cards]] for a workshop. I\'ll pay you back. [[Please keep it quiet.]]',
      flags: ['sender', 'money', 'secrecy'],
      why: ['Private email address', 'Gift cards = scam', 'Asks for secrecy'] },

    // correct personal data is no proof (could come from a data leak)
    { kind: 'Email', phish: true, from: 'THI Student Office', addr: 'office@[[thi-students.example]]',
      context: 'That is your real name and student ID.',
      subject: 'Semester fee missing', body: 'Dear Anna Schnupfelberg (student ID 00123456), your semester fee is missing. [[Pay today or you will be exmatriculated.]]',
      link: 'Pay now', url: '[[thi-students.example]]/pay',
      flags: ['personal', 'sender', 'threat', 'urgency', 'link'],
      why: ['Your real data can come from a data leak', 'Sender is not @thi.de', 'Threat: exmatriculation'] },
    // spelling mistakes
    { kind: 'Email', phish: true, from: 'THI Webmail', addr: 'webmail@[[thi-webmail.example]]',
      subject: 'Acount suspendet!!!', body: '[[Dear costumer, you\'re acount]] will be suspendet. [[Clik hear to verifiy.]]',
      link: 'VERIFIY NOW', url: '[[thi-webmail.example]]/verify',
      flags: ['spelling', 'greeting', 'sender', 'threat'],
      why: ['Spelling mistakes', 'But careful: with AI, phishing is often perfect', 'Sender is not @thi.de'] },
    // reply-to differs from sender
    { kind: 'Email', phish: true, from: 'THI Exam Office', addr: 'pruefungen-wi@thi.de', replyTo: '[[pruefungen.thi@freemail.example]]',
      subject: 'Exam registration problem', body: 'We could not confirm your exam registration. [[Reply with a photo of your ID card.]]',
      flags: ['replyTo', 'data'],
      why: ['Your reply goes to a private address', 'Never send your ID card by email', 'The "From" can be faked'] },
    // QR code (quishing)
    { kind: 'Email', phish: true, from: 'THI IT-Service', addr: 'support@[[thi-wifi.example]]',
      subject: 'New Wi-Fi login', body: 'Our Wi-Fi changes on Monday. [[Scan the QR code with your phone]] and log in with your THI account.',
      qr: '[[thi-wifi.example]]/login',
      flags: ['qr', 'sender', 'data'],
      why: ['A QR code is just a hidden link', 'Leads to thi-wifi.example', 'On your phone you see the address even less'] },
    // someone wants your 2FA code
    { kind: 'SMS', phish: true, from: '[[Unknown number]]', addr: '', context: 'You just got a login code by SMS, but you did not log in.',
      body: 'Hi, it\'s Lena from your course! I sent my code to your number by mistake. [[Can you forward it to me?]]',
      flags: ['channel', 'code'],
      why: ['It\'s YOUR code: someone is logging in as you', 'Never share a code', 'Ask Lena in person'] },


    // inspired by "You Have (1) New-Document - Shared Via Drop-box"
    { kind: 'Email', phish: true, from: 'THI Cloud', addr: 'share@[[thi-cloud.example]]',
      subject: 'Lisa shared "Exam_results.xlsx" with you', body: 'Lisa shared a file with you. [[Sign in with your THI account]] to open it.',
      link: 'Open file', url: '[[thi-cloud.example]]/login',
      flags: ['sender', 'link', 'data', 'unexpected'],
      why: ['Curiosity bait: exam results', 'Sender is not @thi.de', 'Login page is fake'] },
    // student side jobs that are really money laundering
    { kind: 'Email', phish: true, from: 'Campus Jobs', addr: 'jobs@[[student-jobs.example]]',
      subject: 'Easy side job: €500 per week', body: 'Work from home, 2 hours a week. Money arrives on your account and you [[forward it to our partners]]. [[Reply with your bank details]] to start.',
      flags: ['tooGood', 'money', 'data', 'unexpected'],
      why: ['Too good to be true', 'Forwarding money for others is a crime (money mule)', 'Asks for your bank details'] },

    { kind: 'Email', phish: false, from: 'THI Library', addr: 'bibliothek@thi.de',
      context: 'You borrowed this book three weeks ago.',
      subject: 'Your book is due in 3 days', body: '"Network Security" is due on Friday. You can renew it in your library account.',
      link: 'My account', url: 'thi.de/bibliothek',
      why: ['Real domain thi.de', 'No pressure, no threat', 'Link goes where it says'] },
    { kind: 'Email', phish: false, from: 'THI Moodle Support', addr: 'support.moodle@thi.de',
      subject: 'Planned maintenance on Saturday', body: 'Moodle will be offline on Saturday from 8 to 10 am. No action needed.',
      why: ['Real domain thi.de', 'No link, nothing to do'] },
    { kind: 'Email', phish: false, from: 'Prof. Plümpelmoser', addr: 'pluempelmoser@thi.de', context: 'You asked Prof. Plümpelmoser for the slides after class.',
      subject: 'Re: Slides from today', body: 'Hi, here are the slides from today\'s lecture. See you next week!',
      attach: 'Lecture_05_Networks.pdf',
      why: ['You asked for it', 'Real THI address', 'A PDF you expected'] },
    { kind: 'Email', phish: false, from: 'Moodle THI', addr: 'noreply@thi.de',
      context: 'You took this quiz last week.',
      subject: 'New grade: IT Security Quiz', body: 'Your grade for "IT Security Quiz 2" is now available.',
      link: 'Open course', url: 'moodle.thi.de/course',
      why: ['Real domain thi.de', 'Link goes where it says', 'No data asked from you'] },
    // legit QR code
    { kind: 'Email', phish: false, from: 'TicketHub', addr: 'tickets@tickethub.example', context: 'You signed up for THI Campus Day on TicketHub last week.',
      subject: 'Your ticket for Campus Day', body: 'Show this QR code at the entrance. See you on Thursday!',
      qr: 'tickethub.example/ticket/48213',
      why: ['You signed up yourself', 'Sender is the platform you used', 'The QR code goes to tickethub.example'] },
    // legit exam reminder
    { kind: 'Email', phish: false, from: 'THI Exam Office', addr: 'pruefungen-wi@thi.de',
      subject: 'Exam registration open', body: 'You can register for exams until 15 May. Please log in to the student portal as usual.',
      why: ['Real domain thi.de', 'No link: you go to the portal yourself', 'Normal deadline, no threat'] },
    // counterpart to "Password expires in 2 days"
    { kind: 'Email', phish: false, from: 'THI IT-Service', addr: 'support@thi.de',
      subject: 'Your password expires in 14 days', body: 'Please change your password in the THI portal. We will never ask for your password by email.',
      why: ['No link: you open the portal yourself', 'Nobody asks for your password', 'Plenty of time, no threat'] },
    // counterpart to the debt-collection mail
    { kind: 'Email', phish: false, from: 'BookShop', addr: 'orders@bookshop.example', context: 'You ordered a book there last week.',
      subject: 'Your invoice for order 55120', body: 'Thank you for your order! Your invoice is attached.',
      attach: 'Invoice_55120.pdf',
      why: ['You really ordered something', 'A PDF you expected, not a zip', 'No pressure'] },
    // counterpart to the fake HR survey
    { kind: 'Email', phish: false, from: 'Prof. Plümpelmoser', addr: 'pluempelmoser@thi.de', context: 'Prof. Plümpelmoser mentioned the evaluation in class.',
      subject: 'How was the IT Security lecture?', body: 'Please give feedback on the lecture. It is anonymous and open until 20 December.',
      link: 'Open survey', url: 'moodle.thi.de/evaluation',
      why: ['Real THI address', 'Anonymous: no password asked', 'Normal deadline, announced in class'] },
    // counterpart to the parcel-fee SMS
    { kind: 'SMS', phish: false, from: 'QuickParcel', addr: '', context: 'You ordered headphones online yesterday.',
      body: 'Your parcel arrives tomorrow between 10 am and 2 pm. Track it: quickparcel.example/track',
      why: ['You are expecting a parcel', 'No payment, no fee', 'The company\'s real domain'] },
    // counterpart to the semester-fee threat
    { kind: 'Email', phish: false, from: 'THI Studienangelegenheiten', addr: 'studienangelegenheiten@thi.de',
      subject: 'Re-registration for the summer semester', body: 'Dear Anna Schnupfelberg, please pay the semester fee by 15 February. You find the bank details in the student portal.',
      why: ['Real domain thi.de', 'No link: you go to the portal yourself', 'Normal deadline, no threat'] },
    // counterpart to sign-in warnings: a real one that matches what you just did
    { kind: 'Email', phish: false, from: 'MyBank', addr: 'alerts@mybank.example', context: 'You just logged in on your new laptop.',
      subject: 'New sign-in to your account', body: 'Someone signed in from Chrome on Windows. If this was you, you don\'t need to do anything. If not, open the MyBank app.',
      why: ['It matches what you just did', 'No link: it sends you to the app', 'No pressure'] },
    { kind: 'SMS', phish: false, from: 'MyBank', addr: '', context: 'You are logging in to MyBank right now.',
      body: 'Your MyBank code is 482 913. Never share this code. MyBank will never call you to ask for it.',
      why: ['You just tried to log in yourself', 'No link, nothing to click', 'It even warns you'] }
  ];

  /* Red-flag labels, shown next to the answer. */
  var FLAGS = {
    sender: '📧 Wrong sender', spoofed: '🎭 Faked sender', link: '🔗 Fake link', urgency: '⏰ Time pressure',
    threat: '😱 Threat', data: '🔑 Wants your data', tooGood: '🎁 Too good to be true', unexpected: '❓ Unexpected',
    attachment: '📎 Risky attachment', money: '💸 Wants money', secrecy: '🤫 Secrecy', greeting: '👤 No name',
    channel: '📱 Unknown number', personal: '🪪 Real data, still fake', spelling: '✏️ Spelling mistakes',
    replyTo: '↩️ Reply-To differs', qr: '🔳 QR code', code: '🔢 Wants your code'
  };

  var api = { CARDS: CARDS, FLAGS: FLAGS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PHINDER = api;
})(this);
