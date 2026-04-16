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