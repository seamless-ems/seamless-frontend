JT TO DO 

Polar 
- Force currency icon by rule e.g. $ or E
- The curency rules = 
Euro Zone = Euro 
United Kingdom = GBP 
United States = USD 
Canada = CAD 

Profile > BILLING > DONE IN SANDBOX
- Add in a billing section 
- Link to polar 
- Add seamless logo + colours etc 
- Add 'Help' email reference if possible 

Profile > Help 
- Set up Help Form linked to Contact@ Name, email, question
- Auto fill email 
- Include User ID coming back to you 

APPLICATION APPROVED FLOW 

1/ APPLICATION APPROVED EMAIL 
- Wire up the send as per how we do speaker sending 

2/ When application is approved, moved to speakers

3/ Speaker gets email to log into their profile they do NOT get the blank form as per speaker intake 

4/ The status of the speaker is pending the content we have e.g. if application includes all info requried from speaker intake they are marked as Pending Approval, otherwise - it is Info Pending

DEMO SPEAKER CONTENT
- PNGs for white and colour needed, transperant backgrounds for all 
- Fake logos & companies only 



JS TO DO 
Magic Link Emails 
- Provide new copy to James with fields 
Subject 
Username noting (noting it will come from via Seamless (from name) which is best practise not to hit spam)
Body 






- On the application form submission, talk topic should be a large field like Bio 

- On sample content, put in the list of content we can upload (the jotform options in the Read Me). This should be the same on all content uploads and custom field that is a file type BUT user can toggle

- Talk Topic, Talk Description, Proposed Talk Topic, sample content + company logo white are now wired into API. Swap them from custom fields. Company Logo has also been renamed to Company Logo Colour so we have 2x distinct fields 


APPLICATION LIST 
- Match the format to the speaker list e.g. no bio, company and title below name 
- Add a quick preview panel with all info on the right 
- For share speaker application, we need a nice 'copy info or something' so someone can build out an email to somebody with details. MVP = text fields only 
- Remove Share, copy is fine 

SPEAKER PORTAL
- Speaker Portal component 
- Fix how radio / checkbox options are displayed 
- COmpany Logo needs to be renamed to Company Logo colour 
- On Application we have duplication company logo white, check if the bug is still there 





ON ALL UPLOADS 
- Add a loading spin

ON SPEAKER LIST 
- Give James back his stupid headshot icon beside the name but not a shitty circle 


FORM BUILDER 
- When adding custom fields Enter also adds them 



USER JAMES ONLU UPDATES 


Speaker Info 
- we have added talk title, descroption and white logo as default fields in the intake form Right now they are being treated as Custom fieldsin the form, probably worth making them non custom 

- SEcondly, custom fields in general is not appearing 

- When APIs updatex for all default / custom fields JS to then wire everything up in the card builder. The logic will be that all Default fields appear in the card builder when toggled ON in the form. For Titl.Descrption or custom fields - the user gets the tick box option e.g. you might want to build a card with the session Title on it

LinkedIn URL 
- If LinkedIn is selected on form then the LinkedIn icon might appear on speaker cards, we need to wire up that the speakers LinkedIn URL submitted hyperlinks from the LinkedIn icon on their card 

Downloads 
- Coming as HTML not PNGs

Fix this Bug James - see Owen Reid in Event 1 for reference 
chunk-UZOKQUDP.js?v=ca52f163:9129 Uncaught ReferenceError: DropdownMenuSeparator is not defined
    at SpeakerContentTab.tsx:360:30
    at Array.map (<anonymous>)
    at SpeakerContentTab (SpeakerContentTab.tsx:300:28)


Speaker Card Side Panel 
- Add the approve / unapporve button as per Social Card along with the Toggle for publishing (which we already have)


Embed JT Bug 
- The colour backgrounds are not changing when we adjust them in card builder  
- The backend renderer needs to support shape: "rounded" → border-radius on headshot images (this is a square with bevel edges) - one of the 3x shapes we now allow (circle, Square, Rounder) 


Card Builder - social cards 
- Event Logo not coming in 

Speaker Wall 
- we have an api gap for number of columns on mobile and desktop also doesn't seem to be working 
- I have added the buttons on desktop front end bu they need wiring up 

Magic Link Email 
- Clean up copy, subject, etc 

Onboarding FLow 
- I got brought right into /organizer after setting up a new account and didn't see option to enter team etc and got a random team assigned 


Forms 
- I think we have some saving bugs on form fields (description wont go) 
We also need to think about what happens if somebody changes a form mid flow when speakers have submitted 

Applications 
- Approved applicants not moving to speakers 

Speaker Wall - coming in BIG 50% zoom on laptop by default when you open it 
- Preview zoom — the embed renders at a fixed native width (likely 1200px+ for 2 columns of 600px   cards), so the browser auto-shrinks it. They need to add max-width: 100%; overflow-x: hidden; and  
  responsive card sizing to the embed HTML.                                                            2. 
  
  - iframe height — the snippet we generate has height="600" hardcoded. Once the backend fixes the  
  sizing, you'll want a taller default or auto-resizing via postMessage. I can update the snippet      whenever you're ready.

  