# Templates — In-Car-UGC

Warning for agent: ALWAYS prompt for the camera perspective to be from the front forward into the avatar, the angle of the frame should never come from the passenger seat, real people in real life only ever record on their phone from a front angle, as if there’s an imaginary camera on their steering wheel facing straight at them at a front angle. These prompts achieve that with 75% accuracy, but sometimes it slips through the cracks with a passenger seat recording the avatar in the driver seat angle, looks terrible, making said generation useless, make sure that doesn’t happen.

#### - MASTER TEMPLATE

{
  "template_name": "car_tiktok_frame_master_v1",
  "template_purpose": "Internal car TikTok video frame template for a downstream agent. Produces a single frozen frame from native creator car content.",
  "image_type": "a single frame from a TikTok car video, 9:16 vertical",
  "frame_layout": {
    "top_thirty_percent": "car ceiling, headliner fabric texture, dome light, grab handle, visor edge, entirely car roof interior seen from below",
    "middle_forty_percent": "the subject's head and face with headrest behind, side windows showing bright exterior, door pillars framing edges, face sits in frame with space above head and car interior context around them",
    "bottom_thirty_percent": "the subject's chest and upper torso, hands or arms may be visible if doing something natural, frame cuts off roughly at mid-torso or upper thigh depending on posture, lower frame is clean with no large dominant foreground objects"
  },
  "critical_scale_rule": "the subject's head takes up roughly twenty to twenty-five percent of total frame height, NOT fifty, NOT forty, significant ceiling space above their head, whole upper body visible, NOT a close-up face shot, NOT a selfie crop",
  "pov_rule": "the viewer is looking through a phone propped low on the dashboard, the phone is invisible and can never appear, first-person camera perspective",
  "camera": {
    "perspective": "low dashboard height looking slightly upward, one to two feet from subject",
    "aspect_ratio": "9:16",
    "framing": "casually imperfect, subject approximately centered but may drift, slightly awkward crop fine, person and car interior share the frame"
  },
  "what_the_viewer_never_sees": [
    "the phone or any part of it",
    "any evidence of the filming mechanism",
    "the image from outside the car",
    "a passenger or backseat perspective",
    "any large foreground objects dominating the lower frame"
  ],
  "color_and_exposure": {
    "core": "iPhone auto processing in a car interior during daytime, white balance roughly neutral and correct, overall image flat and slightly desaturated but not color-cast in any direction",
    "skin_tones": "skin must look like natural real skin color as captured by an iPhone, not blue-shifted not orange-shifted not tinted, the phone gets skin tones approximately right even when overall image is flat",
    "overall_tone": "flat, slightly desaturated, unenhanced, like raw iPhone video, materials and surfaces retain their true colors, nothing has a color wash",
    "windows": "bright exterior visible through windows, slightly blown out or washed",
    "forbidden": ["blue color cast", "blue tint", "cool blue filter", "warm golden cast", "amber tint", "orange filter", "any visible color cast in any direction", "rich saturated color", "cinematic grading", "film emulation", "any color that looks like a filter", "teal shadows", "any uniform color wash"]
  },
  "avatar_block": {
    "identity": "{{IDENTITY}}",
    "hair": "{{HAIR}}",
    "face": "{{FACE}} — must be a real human face with genuine specificity not a generated composite, visible skin texture at phone distance, natural asymmetry, this must look like one specific real person",
    "eyes": "{{EYES}} — must have active communicative intent directed at the camera lens, not a passive gaze not an aesthetic look",
    "mouth_and_expression": "{{EXPRESSION}} — the mouth must reflect a genuine mid-speech or pre-speech moment with specific asymmetrical muscular engagement, not a generic AI expression",
    "body": "{{BODY}} — sitting in the car seat the way a real person actually sits, asymmetrical, shaped by the seat, not arranged",
    "arms_and_hands": "{{ARMS_AND_HANDS}} — doing something behaviorally real, not compositionally placed",
    "outfit": "{{OUTFIT}} — casual real clothing with compression wrinkles from sitting, not pristine not new",
    "attractiveness": "naturally good looking the way real people are, from genuine facial structure and natural appeal, not from optimized lighting or smoothed skin"
  },
  "environment": {
    "car": "a real car driven daily with visible wear and specific character, not generic not new not luxury unless specified, real upholstery color and material",
    "spatial_feel": "coherent wide-angle phone depth, subject at medium distance with car interior naturally surrounding them, not a tight face crop"
  },
  "lighting": {
    "core": "natural ambient daylight in the car, not designed, illuminates without flattering or glamorizing",
    "quality": "flat and ambient, ordinary daylight through glass, not dramatic not sculpted",
    "forbidden": ["professional lighting", "studio quality", "ring light", "beauty lighting", "dramatic shadows", "cinematic rim light", "any light that looks designed"]
  },
  "hard_negative_prompt": [
    "close-up face shot", "face filling frame", "tight face crop", "selfie distance", "selfie",
    "phone visible", "camera visible", "filming setup visible",
    "handheld camera", "arm holding phone",
    "photo from outside car", "passenger perspective",
    "large steering wheel in foreground", "dashboard instruments",
    "eye level angle",
    "blue color cast", "blue tint", "blue filter", "warm golden cast", "amber tint", "orange filter",
    "any color cast", "color wash", "teal shadows", "cinematic color", "film look", "edited color",
    "model pose", "portrait gaze", "posed smile",
    "squared posture", "upright seated position",
    "glamour lighting", "studio portrait", "ring light",
    "airbrushed skin", "smooth skin", "beauty filter", "composite face",
    "pristine clothing", "brand new clothing",
    "generic car interior", "showroom car", "luxury car",
    "stock photo", "commercial photography",
    "cartoon", "anime", "illustration", "watermark", "text overlay",
    "extra fingers", "warped hands", "deformed face"
  ],
  "non_negotiable": [
    "Head is twenty to twenty-five percent of frame height. NOT a close-up. NOT a selfie crop.",
    "Car ceiling fills the top thirty percent of the frame.",
    "Phone is invisible. No filming mechanism visible.",
    "Color is neutral with no cast in any direction. Skin looks like real skin color.",
    "Face has real human specificity. Not a generated composite.",
    "Eyes have active communicative intent. Not passive gaze.",
    "Posture is natural and asymmetrical. Not arranged.",
    "The car is one specific real vehicle. Not generic.",
    "If it reads as a selfie, a stock photo, or has any color filter it is wrong."
  ]
}






#### - Application of master template 1:
{
  "image_type": "a single frame from a TikTok car video, 9:16 vertical",
  "frame_layout": {
    "top_thirty_percent": "car ceiling, headliner fabric texture, dome light, grab handle, visor edge, this area is entirely car roof interior seen from below",
    "middle_forty_percent": "the subject's head and face with the headrest visible behind them, side windows on either side showing bright exterior, door pillars framing the edges, this is where the subject's face sits in the frame with space above their head and car interior context around them",
    "bottom_thirty_percent": "the subject's chest and upper torso in a casual t-shirt, maybe the top edge of their hands resting in their lap, the frame cuts off roughly at mid-torso, the lower frame is clean with no large objects"
  },
  "critical_scale_rule": "the subject's head takes up roughly twenty to twenty-five percent of the total frame height, NOT fifty percent, NOT forty percent, there is significant ceiling space above their head, their whole upper body is visible, this is NOT a close-up face shot",
  "pov_rule": "the viewer is looking through a phone propped low on the dashboard, the phone is invisible and can never appear, this is first-person camera perspective",
  "camera": {
    "perspective": "low dashboard height looking slightly upward, one to two feet from the subject",
    "aspect_ratio": "9:16",
    "framing": "casually imperfect, subject approximately centered but may drift, slightly awkward crop is fine, the person and the car interior share the frame"
  },
  "what_the_viewer_never_sees": [
    "the phone or any part of it",
    "any evidence of the filming mechanism",
    "the image from outside the car",
    "a passenger or backseat perspective",
    "any large foreground objects dominating the lower frame"
  ],
  "color_and_exposure": {
    "core": "iPhone auto processing in a car interior during daytime, the white balance is roughly neutral and correct, the overall image is flat and slightly desaturated compared to outdoor footage but not color-cast in any direction",
    "skin_tones": "THIS IS CRITICAL: skin must look like natural real skin color as captured by an iPhone, not blue-shifted not orange-shifted not tinted in any direction, brown skin looks brown, pink undertones look pink, the phone gets skin tones approximately right even when the overall image is flat",
    "overall_tone": "flat, slightly desaturated, unenhanced, like raw iPhone video that has not been edited or filtered, the car headliner looks its actual color which is usually beige or gray, the seat fabric looks its actual color, nothing has a color wash over it, materials and surfaces retain their true colors",
    "windows": "bright exterior visible through windows, slightly blown out or washed, this is the brightest area of the frame",
    "forbidden": ["blue color cast", "blue tint", "cool blue filter", "warm golden cast", "amber tint", "orange filter", "any visible color cast in any direction", "rich saturated color", "cinematic grading", "film emulation", "any color that looks like a filter was applied", "teal shadows", "any uniform color wash across the entire image"]
  },
  "subject": {
    "identity": "young mixed-race man, early to mid twenties, chill relaxed energy, the kind of guy who makes TikToks from his car because he just thought of something funny",
    "hair": "short fade haircut, dark brown on top with natural texture, slightly messy from his day, not freshly barbered, a few pieces doing their own thing",
    "face": "real human face with genuine specificity not a generated composite, warm medium-brown skin with visible pore texture at phone distance, natural asymmetry, slight tonal variation across cheeks and jaw, subtle undereye depth, uneven stubble, a minor blemish or two, he looks like one specific real person",
    "eyes": "looking directly at the camera with the energy of someone about to tell a friend something hilarious, mischief and a specific thought visible, not a passive gaze",
    "mouth_and_expression": "THIS IS CRITICAL: his mouth is OPEN, jaw dropped and loose, he is one instant before speaking, the mouth shape is asymmetrical with one side slightly higher, his brows are raised slightly, there is genuine amusement building, this is NOT a closed-mouth smirk, NOT a smile, NOT lips pressed together, the mouth must be visibly open because he is about to talk",
    "body": "slumped naturally in the car seat, asymmetrical, one shoulder lower, leaned slightly to one side, shaped by the seat, not upright not squared not arranged",
    "arms": "resting naturally, hands in lap or on thighs, behaviorally real not compositionally placed",
    "outfit": "casual worn t-shirt with real compression wrinkles from sitting, bunched fabric, slightly faded, collar shifted, not pristine",
    "attractiveness": "naturally good looking the way real people are, from genuine facial structure and easy confidence, not from optimized lighting or smoothed skin, he looks attractive the way real attractive people look on an ordinary day"
  },
  "expression_vibe": {
    "core_intent": "he got in his car, thought of something funny, propped his phone and hit record, this is the frame right before his first word",
    "energy": "the specific energy of a guy about to say 'bro okay so this is going to sound insane but' with a slight laugh underneath it"
  },
  "environment": {
    "car": "a real car driven daily with visible wear and specific character, not generic not new not luxury, real upholstery color and material that feels like one actual vehicle",
    "spatial_feel": "coherent wide-angle phone depth, the subject at medium distance with car interior naturally surrounding them, not a tight face crop"
  },
  "lighting": {
    "core": "natural ambient daylight in the car, the light is not designed it just exists, it illuminates without flattering or glamorizing",
    "quality": "flat and ambient, the kind of light that exists in a parked car during the day, not dramatic not directional not sculpted, just ordinary daylight through glass",
    "forbidden": ["professional lighting", "studio quality", "ring light", "beauty lighting", "dramatic shadows", "cinematic rim light", "any light that looks designed"]
  },
  "hard_negative_prompt": [
    "close-up face shot", "face filling the frame", "tight face crop", "selfie distance", "selfie",
    "phone visible", "camera visible", "filming setup visible",
    "handheld camera", "arm holding phone",
    "closed mouth", "lips pressed together", "closed smile", "smirk with mouth closed",
    "photo from outside car", "passenger perspective",
    "large steering wheel in foreground", "dashboard instruments",
    "eye level angle",
    "blue color cast", "blue tint", "blue filter", "warm golden cast", "amber tint", "orange filter",
    "any color cast", "color wash", "teal shadows", "cinematic color", "film look", "edited color",
    "model pose", "portrait gaze", "posed smile",
    "squared posture", "upright seated position",
    "glamour lighting", "studio portrait", "ring light",
    "airbrushed skin", "smooth skin", "beauty filter", "composite face",
    "pristine clothing", "brand new shirt",
    "generic car interior", "showroom car", "luxury car",
    "stock photo", "commercial photography",
    "cartoon", "anime", "illustration", "watermark", "text overlay",
    "extra fingers", "warped hands", "deformed face"
  ],
  "non_negotiable": [
    "The subject's head is roughly twenty to twenty-five percent of frame height. NOT a close-up. NOT a selfie crop.",
    "The car ceiling fills the top thirty percent of the frame.",
    "The phone is invisible. No filming mechanism visible.",
    "His mouth is OPEN. Not smirking. Not closed-mouth smiling.",
    "Color is neutral with no cast in any direction. Skin looks like real skin color. No blue tint. No warm tint. No filter look.",
    "The face has real human specificity. Not a generated composite.",
    "Eyes have active communicative mischief. Not passive gaze.",
    "Posture is slumped and asymmetrical. Not arranged.",
    "The car is one specific real vehicle. Not generic.",
    "If it reads as a selfie, a stock photo, or has any color filter it is wrong."
  ]
}




### - Application #2

{
  "image_type": "a single frame from a TikTok car video, 9:16 vertical",
  "frame_layout": {
    "top_thirty_percent": "car ceiling, headliner fabric texture, dome light, grab handle, visor edge, entirely car roof interior seen from below",
    "middle_forty_percent": "her head and face with headrest behind, side windows showing bright exterior, door pillars framing edges, space above her head with car interior context around her",
    "bottom_thirty_percent": "her chest and upper body, one knee or thigh pulled up toward her because she has her leg propped up on the seat edge or against the door in a comfortable lazy position, a Red Bull can held casually in one hand near her chest or lap level, frame cuts at roughly mid-body"
  },
  "critical_scale_rule": "her head takes up roughly twenty to twenty-five percent of total frame height, NOT a close-up, NOT a selfie crop, car interior and person share the frame",
  "pov_rule": "the viewer is looking through a phone propped low on the dashboard, the phone is invisible and can never appear, first-person camera perspective",
  "camera": {
    "perspective": "low dashboard height looking slightly upward, one to two feet from her",
    "aspect_ratio": "9:16",
    "framing": "casually imperfect, she may drift slightly off center, crop may feel awkward or top-heavy, quickly propped phone not a composed shot"
  },
  "what_the_viewer_never_sees": [
    "the phone or any part of it",
    "any evidence of the filming mechanism",
    "the image from outside the car",
    "a passenger or backseat perspective",
    "any large foreground objects dominating the frame"
  ],
  "color_and_exposure": {
    "core": "iPhone auto processing in a car interior during daytime, white balance roughly neutral and correct, flat and slightly desaturated but not color-cast in any direction",
    "skin_tones": "skin looks like natural real skin as captured by an iPhone, not blue-shifted not orange-shifted not tinted, fair skin with natural pink undertone looks like fair skin with natural pink undertone",
    "overall_tone": "flat, slightly desaturated, unenhanced, raw iPhone video look, materials retain true colors, no color wash",
    "windows": "bright exterior visible through windows, slightly blown out",
    "forbidden": ["blue color cast", "blue tint", "warm golden cast", "amber tint", "any color cast in any direction", "rich saturated color", "cinematic grading", "any filter look"]
  },
  "subject": {
    "identity": "young woman, early twenties, cute and naturally pretty, relaxed comfortable energy like she is settled into her car and ready to hang out and talk for a while",
    "hair": "blonde, slightly past shoulder length, a little messy and not perfectly styled, maybe tucked behind one ear or falling forward on one side, natural texture with some flyaways, not salon-fresh not blown out not influencer-styled",
    "face": "real human face with genuine specificity, fair skin with natural warmth and slight pink undertone, visible skin texture at phone distance, a freckle or two, slight natural flush on cheeks, natural brow shape not perfectly groomed, light natural undereye depth, she looks like one specific real girl not a generated composite of cute blonde features",
    "eyes": "bright and alive, looking at the camera with warm friendly energy like she is about to tell her followers something exciting or funny, communicative and engaged, not a passive gaze not an aesthetic look",
    "mouth_and_expression": "smiling with her mouth slightly open, teeth showing naturally, the smile is genuine and asymmetrical the way real smiles are with one side pulled slightly higher, she is mid-smile and about to start talking, the expression has the energy of someone who just said 'okay okay okay so' and is about to launch into a story, there is warmth and slight excitement in her face, NOT a posed influencer smile NOT a beauty campaign expression",
    "body": "settled deep into her seat in a super comfortable lazy position, one leg pulled up with her knee or thigh propped against the door or tucked up on the seat edge, her body is angled and asymmetrical because of the leg position, she looks like she has been sitting here comfortably for a few minutes, not posed not arranged",
    "arms_and_hands": "one hand holding a Red Bull can casually near her chest or lap level, the can is held loosely and naturally not presented to camera not product-placed, her other hand rests on her propped-up knee or thigh or hangs naturally, the Red Bull is incidental not the focus",
    "outfit": "casual comfortable top or oversized t-shirt, the kind of thing you throw on to run errands, real fabric compression from sitting, not styled not editorial not pristine",
    "attractiveness": "naturally cute and pretty in the real-life way where you'd notice her and think she's attractive, it comes from genuine facial features and natural warmth and easy energy, not from makeup or lighting or angles, she looks like a real girl who happens to be cute not like a model pretending to be casual"
  },
  "expression_vibe": {
    "core_intent": "she parked her car, cracked a Red Bull, propped her phone on the dash and hit record because she has something to share, she is comfortable and settled in and ready to talk",
    "energy": "warm, friendly, slightly excited, the energy of a girl who is about to say 'okay so you guys are NOT going to believe what happened today' with a big smile"
  },
  "red_bull_rules": {
    "hold_style": "held casually in one hand the way you actually hold a drink in a car, loosely gripped, maybe slightly tilted, not presented to camera, not centered in frame, not product-shot composed",
    "prominence": "the Red Bull is a secondary detail not a primary subject, it is something she happens to be holding while she talks, her face is always the dominant element"
  },
  "environment": {
    "car": "a real car driven daily with visible wear, not generic not new not luxury, real upholstery with specific color and texture",
    "spatial_feel": "coherent wide-angle phone depth, she is at medium distance with car interior naturally surrounding her"
  },
  "lighting": {
    "core": "natural ambient daylight in the car, flat and ordinary, not designed, not flattering",
    "forbidden": ["professional lighting", "studio quality", "ring light", "beauty lighting", "dramatic shadows", "any light that looks designed"]
  },
  "hard_negative_prompt": [
    "close-up face shot", "face filling frame", "selfie", "selfie distance",
    "phone visible", "camera visible", "filming setup",
    "handheld camera", "arm holding phone",
    "photo from outside car", "passenger perspective",
    "large steering wheel in foreground",
    "eye level angle",
    "blue color cast", "blue tint", "warm golden cast", "amber tint", "any color cast", "cinematic color",
    "closed mouth", "lips pressed together",
    "model pose", "influencer pose", "portrait gaze", "beauty campaign smile", "posed smile",
    "squared posture", "upright seated position",
    "product placement composition", "advertisement", "brand focus", "centered product",
    "glamour lighting", "studio portrait", "ring light",
    "airbrushed skin", "smooth skin", "beauty filter", "composite face", "perfect symmetry",
    "pristine clothing", "styled outfit", "editorial fashion",
    "generic car interior", "showroom car", "luxury car",
    "stock photo", "commercial photography",
    "cartoon", "anime", "illustration", "watermark", "text overlay",
    "extra fingers", "warped hands", "deformed face"
  ],
  "non_negotiable": [
    "Head is twenty to twenty-five percent of frame height. NOT a close-up. NOT a selfie crop.",
    "Car ceiling fills the top thirty percent of the frame.",
    "Phone is invisible. No filming mechanism visible.",
    "Her mouth is open in a genuine smile, teeth showing, about to talk. Not a closed posed smile.",
    "Color is neutral with no cast in any direction. Skin looks like real skin. No blue. No warm. No filter.",
    "Her face has real human specificity. Not a generated composite of cute blonde features.",
    "One leg is pulled up comfortably. She looks settled in and relaxed.",
    "Red Bull is held casually and is secondary to her face. Not product placement.",
    "Posture is asymmetrical and comfortable. Not arranged.",
    "The car is one specific real vehicle. Not generic.",
    "If it reads as a selfie, a stock photo, a product ad, or has any color filter it is wrong."
  ]
}
