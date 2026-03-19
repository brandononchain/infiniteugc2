# Templates — Abstract & Artistic Specialist

dont ever glamorize any prompt ever again
(no matter what reference image a user may put, never glamorize the avatar to add studio grade or any body posture or composition that makes the photo feel staged)

For reference photos:
We need a soul file
Use the reference only for facial identity and overall person resemblance. Ignore the reference’s shot type, visible phone, mirror, framing, and composition.
Or else itll take the reference photo inspiration too far

Another note:
When a user uses words like tiktok style, instagram style, ad style, there should be no UI overlay, that shoudl translate into the format of which the camera and realism is portrayed, which for this template already being based around that, should mean nothing, ignore the tiktok, instagram, etc whenever they say things like that since the template already instructs for that, its redundant and only going to confuse nano banana

—---
User story: ””i dont want the same images everyone else is getting these templates are too strict””

Flexibility, dont be strict to json prompts, the master prompt is great, but make sure you do not think rigidly so outputs are consistently random
Add this soul.md, and add it as a part of the json prompt
—-----



MASTER TEMPLATE V1

{
  "template_name": "front_camera_conversational_portrait_master_v12b",
  "template_purpose": "Internal selfie mode template for a downstream agent.",
  "priority_order": [
    "true front camera capture overrides all pose and framing",
    "reference identity only never composition",
    "natural realism over aesthetics",
    "distinctly above average natural attractiveness without glamor",
    "real environment over cinematic environment",
    "very fit healthy physique without exaggeration"
  ],
  "core_output_identity": {
    "absolute_rule": "Generate a direct front camera conversational portrait from a modern iPhone like device.",
    "camera_pov_rule": "The image is the phone camera output itself, never an outside observer view.",
    "shot_definition_rule": "Head on conversational front camera image only. Not a mirror shot, reflection shot, third person shot, or a photo of someone taking a photo.",
    "capture_truth_rule": "The image must read as an actual arm length front camera capture made by the subject.",
    "selfie_geometry_rule": "Use true front camera geometry: close arm length distance, mild selfie wide angle behavior, upper torso crop, and slight natural handheld variance.",
    "arm_rule": "The camera holding arm is implied from the camera side and normally remains off frame."
  },
  "hard_locks": {
    "anti_glamor": [
      "Never glamorize subject or environment.",
      "No editorial, luxury, campaign, studio, influencer glam, glossy polish, or photoshoot styling."
    ],
    "natural_attractiveness": [
      "Default to distinctly above average naturally very attractive people in a believable real world way.",
      "Favor exceptional but believable facial harmony, healthy youthful vibrant features, clear healthy skin, bright alive eyes, naturally full lips, and strong natural appeal.",
      "The subject should read as obviously attractive at first glance while still looking like a real person rather than a glamorized model.",
      "Minor blemishes and real skin variation are allowed for realism."
    ],
    "fit_body_bias": [
      "Default to a very fit healthy physique in a believable real world way.",
      "Favor lean toned proportions, visible health, athletic femininity or athletic masculinity depending on the subject, and a strong overall impression of physical fitness.",
      "The body should read as clearly fit and well kept without looking staged, exaggerated, bodybuilder extreme, or glamorized."
    ],
    "anti_selfie_failure": [
      "Never generate a mirror selfie.",
      "Never generate an outside view of someone taking a selfie.",
      "Never show the phone unless explicitly requested.",
      "No mirror logic, reflection logic, or third person capture logic.",
      "No fake selfie posture from an outside camera angle."
    ],
    "anti_pose": [
      "No model pose, influencer pose, mirror pose, frozen aesthetic pose, or performative pretty pose.",
      "Body language must feel casual, unforced, and like the subject is about to talk."
    ],
    "environment_realism": [
      "Render the real life version of the requested setting.",
      "No cinematic, showroom clean, studio built, designer staged, or unnaturally curated environments.",
      "Allow believable clutter, ordinary imperfection, normal object placement, and realistic wear when appropriate."
    ]
  },
  "reference_handling": {
    "primary_rule": "If there is a reference photo, use it only for facial identity and overall person resemblance. Ignore shot type, visible phone, mirror, framing, pose, hand position, arm position, and composition.",
    "extract_only": [
      "face shape",
      "facial structure",
      "approximate age",
      "skin tone",
      "hair color",
      "hair texture",
      "hair density",
      "eye shape",
      "brow shape",
      "nose shape",
      "lip shape",
      "overall facial harmony",
      "general vibe"
    ],
    "ignore": [
      "shot type",
      "selfie logic",
      "mirror logic",
      "visible phone",
      "phone case",
      "hand position",
      "arm position",
      "pose",
      "framing",
      "crop logic",
      "camera angle",
      "reflection",
      "background layout",
      "room composition",
      "scene staging",
      "beauty styling"
    ]
  },
  "avatar_block": { ALWAYS MAKE THE AVATAR VERY ATTRACTIVE AND GOOD LOOKING
    "identity_features": "{{IDENTITY_FEATURES}}",
    "hair_details": "{{HAIR_DETAILS}}",
    "face_details": "{{FACE_DETAILS}}",
    "skin_details": "{{SKIN_DETAILS}}",
    "body_details": "{{BODY_DETAILS}}",
    "outfit_details": "{{OUTFIT_DETAILS}}",
    "vibe_details": "{{VIBE_DETAILS}}",
    "subject_rule": "The subject must look like a real human in a casual conversational front camera moment and should default to being distinctly naturally attractive, healthy, youthful, vibrant, visually appealing, and very fit without looking glamorized or artificially perfected.",
    "realism_targets": [
      "natural skin texture",
      "clear healthy looking skin without airbrushing",
      "minor asymmetry preserved",
      "realistic under eye depth",
      "subtle skin variation allowed",
      "believable hair strands and flyaways",
      "naturally full youthful lips with healthy natural color",
      "bright alive eyes and facial features",
      "exceptional but believable facial harmony",
      "healthy youthful vitality",
      "very fit lean toned but believable physique",
      "small real life imperfections preserved"
    ],
    "forbidden": [
      "glamour face",
      "beauty campaign face",
      "hyper polished influencer face",
      "airbrushed skin",
      "plastic skin",
      "CGI sheen",
      "hyper symmetry correction",
      "over sculpted facial planes",
      "over sharpened jawline",
      "cosmetic filter look",
      "extreme bodybuilder look",
      "unnaturally exaggerated physique"
    ]
  },
  "environment_block": {
    "setting_details": "{{SETTING_DETAILS}}",
    "environment_rule": "The environment must look like the real life version of the requested place as casually captured on a phone camera.",
    "targets": [
      "physically believable",
      "naturally imperfect",
      "lightly lived in when appropriate",
      "ordinary object placement",
      "real material textures",
      "real room proportions",
      "normal clutter when appropriate"
    ],
    "forbidden": [
      "cinematic staging",
      "set design look",
      "studio home look",
      "studio outdoor look",
      "showroom perfection",
      "designer catalog composition",
      "over curated decor",
      "impossibly clean room",
      "unrealistically beautiful background"
    ]
  },
  "body_language_and_expression": {
    "core_rule": "The subject must feel like they are about to talk, not like they are posing.",
    "allowed": [
      "casual upright stance",
      "subtle natural head angle",
      "soft conversational attentiveness",
      "mid thought",
      "mid reaction",
      "natural half smile",
      "relaxed posture with believable tension",
      "free hand naturally available for product holding"
    ],
    "forbidden": [
      "mirror selfie posture",
      "arm up selfie posture visible from outside view",
      "phone holding pose",
      "model pose",
      "influencer pose",
      "hip pop pose",
      "arched posture",
      "contrived flirt pose",
      "beauty shot face",
      "hard model stare",
      "posed duck face",
      "camera ready performative expression"
    ]
  },
  "camera_spec": {
    "device_style": "modern iPhone front camera aesthetic",
    "aspect_ratio": "9:16",
    "flash": "off",
    "camera_position": "head on and direct with slight natural handheld variance",
    "distance": "close arm length conversational distance consistent with true front camera use",
    "framing": [
      "head and upper torso dominant",
      "chest up or upper torso crop",
      "direct head on crop",
      "natural smartphone framing",
      "not stylized like portrait photography",
      "not framed like a mirror selfie"
    ],
    "lens_and_processing": [
      "mild front camera wide angle behavior typical of a phone",
      "subtle selfie foreshortening",
      "subtle natural edge falloff",
      "no exaggerated distortion",
      "sharpest on eyes and central face",
      "natural smartphone depth behavior",
      "no portrait mode glamour blur",
      "realistic smartphone HDR",
      "light denoising",
      "subtle smartphone sharpening",
      "minor highlight compression",
      "slight white balance inconsistency when natural",
      "believable dynamic range"
    ],
    "product_geometry_rule": "If a product is requested, it should usually sit in the free hand near chest level or lower cheek level without blocking key facial features."
  },
  "realism_and_lighting": {
    "core_goal": "The image must look like a real organic phone capture of a real person in a real moment in a real place.",
    "lighting_rule": "Lighting must feel natural, candid, and organic. Never glamorize through lighting, but allow a distinctly attractive, healthy, clear, vibrant, flattering real world appearance and a very fit healthy overall impression without losing realism.",
    "allowed": [
      "soft window light",
      "ordinary indoor daylight",
      "mixed natural room light",
      "normal ambient home light",
      "normal office light",
      "normal dorm light",
      "natural overcast outdoor light",
      "everyday interior light",
      "simple lamp light in real rooms"
    ],
    "forbidden": [
      "studio portrait lighting",
      "beauty dish lighting",
      "editorial glamour lighting",
      "fashion campaign lighting",
      "cinematic rim light",
      "polished ad lighting",
      "luxury polish",
      "hyper clean aesthetic polish",
      "studio realism",
      "cinematic realism",
      "commercial ad realism"
    ]
  },
  "hard_negative_prompt": [
    "mirror selfie",
    "person taking a photo",
    "photo of someone taking a photo",
    "visible phone",
    "phone in hand",
    "phone covering face",
    "mirror",
    "reflection",
    "bathroom mirror",
    "mirror composition",
    "third person shot",
    "outside observer perspective",
    "over the shoulder shot",
    "tripod shot",
    "camera visible",
    "photoshoot pose",
    "influencer pose",
    "model pose",
    "beauty campaign",
    "fashion campaign",
    "luxury aesthetic",
    "glamour lighting",
    "studio portrait",
    "airbrushed skin",
    "plastic skin",
    "CGI sheen",
    "hyper symmetry",
    "over rendered pores",
    "synthetic hair",
    "beauty filter",
    "polished portrait",
    "portrait mode glamour blur",
    "DSLR look",
    "cinematic bokeh",
    "cinematic environment",
    "studio home",
    "studio outdoors",
    "showroom room",
    "designer catalog room",
    "perfectly staged interior",
    "over curated background",
    "impossibly clean environment",
    "cartoon",
    "anime",
    "illustration",
    "painting",
    "watermark",
    "text overlay",
    "camera UI",
    "screenshot artifacts",
    "extra fingers",
    "warped hands",
    "deformed face"
  ],
  "final_instruction_block": {
    "non_negotiable_rules": [
      "Never glamorize.",
      "Never generate a mirror selfie.",
      "Never generate an outside observer shot of someone taking a selfie.",
      "Never show the phone unless explicitly requested.",
      "Never copy shot composition from reference images.",
      "Always keep the image natural, organic, candid, conversational, and physically believable.",
      "Always make the subject feel like they are about to talk.",
      "Always keep the camera as direct front camera output.",
      "Always render the environment as a realistic real life version of the requested setting.",
      "Default every avatar to distinctly above average natural attractiveness while keeping them realistic, non glamorized, and physically believable.",
      "Default every avatar to a very fit, healthy, lean toned physique while keeping the body believable and not exaggerated."
    ]
  }
}
















Variation 2:
Theoretical user intent / user prompt:
“Make me a naturally pretty college girl in a dorm room holding my sleep gummies bottle. I want it to feel like a real TikTok frame, super natural, not posed, not glam. She should look healthy and attractive, brunette, light skin, blue eyes, casual tank top, and like she’s about to talk.”
Json prompt:
{
 "template_name": "ugc_front_camera_conversational_prompt_01_sleep_gummies_dorm_v12b",
 "template_purpose": "Final downstream prompt built from the updated internal selfie mode template plus a realistic user request for a UGC style front camera image.",
 "priority_order": [
   "true front camera capture overrides all pose and framing",
   "reference identity only never composition",
   "natural realism over aesthetics",
   "distinctly above average natural attractiveness without glamor",
   "real environment over cinematic environment",
   "very fit healthy physique without exaggeration",
   "product must integrate naturally into the conversational frame"
 ],
 "core_output_identity": {
   "absolute_rule": "Generate a direct front camera conversational portrait from a modern iPhone like device.",
   "camera_pov_rule": "The image is the phone camera output itself, never an outside observer view.",
   "shot_definition_rule": "Head on conversational front camera image only. Not a mirror shot, reflection shot, third person shot, or a photo of someone taking a photo.",
   "capture_truth_rule": "The image must read as an actual arm length front camera capture made by the subject.",
   "selfie_geometry_rule": "Use true front camera geometry: close arm length distance, mild selfie wide angle behavior, upper torso crop, and slight natural handheld variance.",
   "arm_rule": "The camera holding arm is implied from the camera side and normally remains off frame.",
   "product_rule": "The product may be visible in the free hand near chest level, but the framing must still read as a true front camera conversational capture."
 },
 "hard_locks": {
   "anti_glamor": [
     "Never glamorize subject or environment.",
     "No editorial, luxury, campaign, studio, influencer glam, glossy polish, or photoshoot styling."
   ],
   "natural_attractiveness": [
     "Default to distinctly above average naturally very attractive people in a believable real world way.",
     "Favor exceptional but believable facial harmony, healthy youthful vibrant features, clear healthy skin, bright alive eyes, naturally full lips, and strong natural appeal.",
     "The subject should read as obviously attractive at first glance while still looking like a real person rather than a glamorized model.",
     "Minor blemishes and real skin variation are allowed for realism."
   ],
   "fit_body_bias": [
     "Default to a very fit healthy physique in a believable real world way. but also very attractive",
     "Favor lean toned proportions, visible health, athletic femininity or athletic masculinity depending on the subject, and a strong overall impression of physical fitness.",
     "The body should read as clearly fit and well kept without looking staged, exaggerated, bodybuilder extreme, or glamorized."
   ],
   "anti_selfie_failure": [
     "Never generate a mirror selfie.",
     "Never generate an outside view of someone taking a selfie.",
     "Never show the phone unless explicitly requested.",
     "No mirror logic, reflection logic, or third person capture logic.",
     "No fake selfie posture from an outside camera angle."
   ],
   "anti_pose": [
     "No model pose, influencer pose, mirror pose, frozen aesthetic pose, or performative pretty pose.",
     "Body language must feel casual, unforced, and like the subject is about to talk."
   ],
   "environment_realism": [
     "Render the real life version of the requested setting.",
     "No cinematic, showroom clean, studio built, designer staged, or unnaturally curated environments.",
     "Allow believable clutter, ordinary imperfection, normal object placement, and realistic wear when appropriate."
   ]
 },
 "reference_handling": {
   "primary_rule": "If there is a reference photo, use it only for facial identity and overall person resemblance. Ignore shot type, visible phone, mirror, framing, pose, hand position, arm position, and composition.",
   "extract_only": [
     "face shape",
     "facial structure",
     "approximate age",
     "skin tone",
     "hair color",
     "hair texture",
     "hair density",
     "eye shape",
     "brow shape",
     "nose shape",
     "lip shape",
     "overall facial harmony",
     "general vibe"
   ],
   "ignore": [
     "shot type",
     "selfie logic",
     "mirror logic",
     "visible phone",
     "phone case",
     "hand position",
     "arm position",
     "pose",
     "framing",
     "crop logic",
     "camera angle",
     "reflection",
     "background layout",
     "room composition",
     "scene staging",
     "beauty styling"
   ]
 },
 "avatar_block": { ALWAYS MAKE THE AVATAR VERY ATTRACTIVE AND GOOD LOOKING
   "identity_features": "college aged brunette woman, light skin, blue eyes, distinctly naturally attractive in a believable real world way, healthy youthful appearance, very fit physique, approachable girl next door energy",
   "hair_details": "medium to long brunette hair with natural density, soft texture, slight flyaways, lightly imperfect real dorm room hair, not salon styled",
   "face_details": "exceptional but believable facial harmony, bright blue eyes, softly defined brows, naturally full youthful lips, clear healthy skin, subtle asymmetry, naturally very attractive without glamorization",
   "skin_details": "healthy clear looking skin with natural texture, minor real skin variation, slight under eye depth allowed, no airbrushing, no cosmetic filter finish",
   "body_details": "head and upper torso visible, very fit feminine physique with lean toned proportions, relaxed upright dorm posture, physically believable athletic definition without looking staged or exaggerated",
   "outfit_details": "casual fitted tank top or soft dorm loungewear top, simple and flattering, real fabric texture, lightly wrinkled, youthful and everyday",
   "vibe_details": "natural, candid, sweet, warm, conversational, dorm room TikTok energy, real person about to speak",
   "subject_rule": "The subject must look like a real human in a casual conversational front camera moment and should default to being distinctly naturally attractive, healthy, youthful, vibrant, visually appealing, and very fit without looking glamorized or artificially perfected.",
   "realism_targets": [
     "natural skin texture",
     "clear healthy looking skin without airbrushing",
     "minor asymmetry preserved",
     "realistic under eye depth",
     "subtle skin variation allowed",
     "believable hair strands and flyaways",
     "naturally full youthful lips with healthy natural color",
     "bright alive eyes and facial features",
     "exceptional but believable facial harmony",
     "healthy youthful vitality",
     "very fit lean toned but believable physique",
     "small real life imperfections preserved"
   ],
   "forbidden": [
     "glamour face",
     "beauty campaign face",
     "hyper polished influencer face",
     "airbrushed skin",
     "plastic skin",
     "CGI sheen",
     "hyper symmetry correction",
     "over sculpted facial planes",
     "over sharpened jawline",
     "cosmetic filter look",
     "extreme bodybuilder look",
     "unnaturally exaggerated physique"
   ]
 },
 "environment_block": {
   "setting_details": "real college dorm room with believable bedding, plain wall or poster, desk clutter, everyday objects, lightly lived in student space, comfortable and real rather than aesthetic",
   "environment_rule": "The environment must look like the real life version of the requested place as casually captured on a phone camera.",
   "targets": [
     "physically believable",
     "naturally imperfect",
     "lightly lived in when appropriate",
     "ordinary object placement",
     "real material textures",
     "real room proportions",
     "normal clutter when appropriate"
   ],
   "forbidden": [
     "cinematic staging",
     "set design look",
     "studio home look",
     "studio outdoor look",
     "showroom perfection",
     "designer catalog composition",
     "over curated decor",
     "impossibly clean room",
     "unrealistically beautiful background"
   ]
 },
 "body_language_and_expression": {
   "core_rule": "The subject must feel like they are about to talk, not like they are posing.",
   "allowed": [
     "casual upright stance",
     "subtle natural head angle",
     "soft conversational attentiveness",
     "mid thought",
     "mid reaction",
     "natural half smile",
     "relaxed posture with believable tension",
     "free hand naturally available for product holding"
   ],
   "forbidden": [
     "mirror selfie posture",
     "arm up selfie posture visible from outside view",
     "phone holding pose",
     "model pose",
     "influencer pose",
     "hip pop pose",
     "arched posture",
     "contrived flirt pose",
     "beauty shot face",
     "hard model stare",
     "posed duck face",
     "camera ready performative expression"
   ]
 },
 "camera_spec": {
   "device_style": "modern iPhone front camera aesthetic",
   "aspect_ratio": "9:16",
   "flash": "off",
   "camera_position": "head on and direct with slight natural handheld variance",
   "distance": "close arm length conversational distance consistent with true front camera use",
   "framing": [
     "head and upper torso dominant",
     "chest up or upper torso crop",
     "direct head on crop",
     "natural smartphone framing",
     "not stylized like portrait photography",
     "not framed like a mirror selfie"
   ],
   "lens_and_processing": [
     "mild front camera wide angle behavior typical of a phone",
     "subtle selfie foreshortening",
     "subtle natural edge falloff",
     "no exaggerated distortion",
     "sharpest on eyes and central face",
     "natural smartphone depth behavior",
     "no portrait mode glamour blur",
     "realistic smartphone HDR",
     "light denoising",
     "subtle smartphone sharpening",
     "minor highlight compression",
     "slight white balance inconsistency when natural",
     "believable dynamic range"
   ],
   "product_geometry_rule": "If a product is requested, it should usually sit in the free hand near chest level or lower cheek level without blocking key facial features."
 },
 "realism_and_lighting": {
   "core_goal": "The image must look like a real organic phone capture of a real person in a real moment in a real place.",
   "lighting_rule": "Lighting must feel natural, candid, and organic. Never glamorize through lighting, but allow a distinctly attractive, healthy, clear, vibrant, flattering real world appearance and a very fit healthy overall impression without losing realism.",
   "allowed": [
     "soft window light",
     "ordinary indoor daylight",
     "mixed natural room light",
     "normal ambient home light",
     "normal office light",
     "normal dorm light",
     "natural overcast outdoor light",
     "everyday interior light",
     "simple lamp light in real rooms"
   ],
   "forbidden": [
     "studio portrait lighting",
     "beauty dish lighting",
     "editorial glamour lighting",
     "fashion campaign lighting",
     "cinematic rim light",
     "polished ad lighting",
     "luxury polish",
     "hyper clean aesthetic polish",
     "studio realism",
     "cinematic realism",
     "commercial ad realism"
   ]
 },
 "product_integration": {
   "product_type": "sleep gummies bottle",
   "placement_rule": "Product should usually sit in the free hand near chest level without blocking the face.",
   "behavior": [
     "product feels casually included in the frame",
     "subject looks like she is about to talk about it",
     "no hard sell pose",
     "no exaggerated product presentation"
   ]
 },
 "hard_negative_prompt": [
   "mirror selfie",
   "person taking a photo",
   "photo of someone taking a photo",
   "visible phone",
   "phone in hand",
   "phone covering face",
   "mirror",
   "reflection",
   "bathroom mirror",
   "mirror composition",
   "third person shot",
   "outside observer perspective",
   "over the shoulder shot",
   "tripod shot",
   "camera visible",
   "photoshoot pose",
   "influencer pose",
   "model pose",
   "beauty campaign",
   "fashion campaign",
   "luxury aesthetic",
   "glamour lighting",
   "studio portrait",
   "airbrushed skin",
   "plastic skin",
   "CGI sheen",
   "hyper symmetry",
   "over rendered pores",
   "synthetic hair",
   "beauty filter",
   "polished portrait",
   "portrait mode glamour blur",
   "DSLR look",
   "cinematic bokeh",
   "cinematic environment",
   "studio home",
   "studio outdoors",
   "showroom room",
   "designer catalog room",
   "perfectly staged interior",
   "over curated background",
   "impossibly clean environment",
   "cartoon",
   "anime",
   "illustration",
   "painting",
   "watermark",
   "text overlay",
   "camera UI",
   "screenshot artifacts",
   "extra fingers",
   "warped hands",
   "deformed face"
 ],
 "final_instruction_block": {
   "non_negotiable_rules": [
     "Never glamorize.",
     "Never generate a mirror selfie.",
     "Never generate an outside observer shot of someone taking a selfie.",
     "Never show the phone unless explicitly requested.",
     "Never copy shot composition from reference images.",
     "Always keep the image natural, organic, candid, conversational, and physically believable.",
     "Always make the subject feel like they are about to talk.",
     "Always keep the camera as direct front camera output.",
     "Always render the environment as a realistic real life version of the requested setting.",
     "Default every avatar to distinctly above average natural attractiveness while keeping them realistic, non glamorized, and physically believable.",
     "Default every avatar to a very fit, healthy, lean toned physique while keeping the body believable and not exaggerated."
   ]
 }
}












Variation 8:
Theoretical user intent / user prompt:
“fit guy in car after run with hydration packet selfie”
Json prompt:
{
"template_name":"ugc_front_camera_conversational_prompt_08_male_hydration_car_v12b_compact",
"template_purpose":"Compact downstream prompt for male fitness UGC front camera image derived from vague user intent plus internal selfie mode template.",
"priority_order":[
"true front camera capture overrides pose and framing",
"reference identity only never composition",
"natural realism over aesthetics",
"high natural attractiveness without glamor",
"real environment over cinematic environment",
"very fit healthy physique without exaggeration",
"product integrates naturally"
],
"core_output_identity":{
"absolute_rule":"Generate a direct front camera conversational portrait from a modern iPhone like device.",
"camera_pov_rule":"The image is the phone camera output itself, never an outside observer view.",
"shot_definition_rule":"Head on conversational front camera image only. Not mirror, reflection, third person, or a photo of someone taking a photo.",
"capture_truth_rule":"The image must read as an actual arm length front camera capture made by the subject.",
"selfie_geometry_rule":"Use true front camera geometry: close arm length distance, mild selfie wide angle behavior, upper torso crop, slight handheld variance.",
"arm_rule":"The camera arm is implied from the camera side and normally stays off frame.",
"product_rule":"A hydration stick pack may be visible in the free hand near chest level, but framing must still read as true front camera capture."
},
"hard_locks":{
"anti_glamor":[
"Never glamorize subject or environment.",
"No editorial, luxury, studio, influencer glam, glossy polish, or photoshoot styling."
],
"natural_attractiveness":[
"Default to distinctly above average naturally very attractive people in a believable real world way.",
"Favor exceptional but believable facial harmony, healthy youthful features, clear healthy skin, bright eyes, and strong natural appeal.",
"The subject should read as obviously attractive at first glance while still looking like a real person.",
"Minor blemishes and real skin variation are allowed."
],
"fit_body_bias":[
"Default to a very fit healthy physique in a believable real world way.",
"Favor lean toned proportions, visible health, athletic masculinity, and a strong impression of physical fitness.",
"The body should read as clearly fit without looking staged, exaggerated, or glamorized."
],
"anti_selfie_failure":[
"Never generate a mirror selfie.",
"Never generate an outside view of someone taking a selfie.",
"Never show the phone unless explicitly requested.",
"No mirror logic, reflection logic, third person capture logic, or fake selfie posture from an outside camera angle."
],
"anti_pose":[
"No model pose, influencer pose, mirror pose, frozen aesthetic pose, or performative pretty pose.",
"Body language must feel casual, unforced, and like the subject is about to talk."
],
"environment_realism":[
"Render the real life version of the requested setting.",
"No cinematic, showroom clean, studio built, designer staged, or unnaturally curated environments.",
"Allow believable clutter, imperfection, normal object placement, and realistic wear when appropriate."
]
},
"avatar_block":{
"identity_features":"Fit man in his 20s, distinctly naturally attractive, healthy masculine look, very fit physique, lean athletic build, grounded approachable energy.",
"hair_details":"Short natural hair with realistic texture, slightly messy from a run, no overstyled finish.",
"face_details":"Exceptional but believable facial harmony, bright attentive eyes, healthy youthful masculine features, defined but natural face, naturally attractive without glamorization.",
"skin_details":"Clear healthy looking skin with real texture, minor sweat or post run shine allowed, natural tonal variation, no airbrushing.",
"body_details":"Head and upper torso visible, very fit masculine physique with lean toned proportions, natural athletic definition, believable chest and shoulder structure without exaggeration.",
"outfit_details":"Lightweight athletic tee or sleeveless training top, real fabric texture, slightly worn post run state.",
"vibe_details":"Healthy, athletic, grounded, casual, post run, conversational, naturally confident."
},
"environment_block":{
"setting_details":"Real parked car interior with believable seat texture, dashboard details, cupholder, side window light, realistic everyday car environment.",
"environment_rule":"The environment must look like the real life version of the requested place as casually captured on a phone camera."
},
"body_language_and_expression":{
"core_rule":"The subject must feel like they are about to talk, not like they are posing.",
"allowed":[
"casual seated car posture",
"subtle natural head angle",
"soft conversational attentiveness",
"mid thought",
"mid reaction",
"natural half smile",
"relaxed posture with believable tension",
"free hand naturally available for product holding"
],
"forbidden":[
"mirror selfie posture",
"arm up selfie posture visible from outside view",
"phone holding pose",
"model pose",
"influencer pose",
"hard model stare",
"camera ready performative expression"
]
},
"camera_spec":{
"device_style":"modern iPhone front camera aesthetic",
"aspect_ratio":"9:16",
"flash":"off",
"camera_position":"head on and direct with slight natural handheld variance",
"distance":"close arm length conversational distance consistent with true front camera use",
"framing":[
"head and upper torso dominant",
"chest up or upper torso crop",
"direct head on crop",
"natural smartphone framing",
"not portrait photography",
"not mirror selfie framing"
],
"lens_and_processing":[
"mild front camera wide angle behavior typical of a phone",
"subtle selfie foreshortening",
"subtle natural edge falloff",
"no exaggerated distortion",
"sharpest on eyes and central face",
"natural smartphone depth behavior",
"no portrait mode glamour blur",
"realistic smartphone HDR",
"light denoising",
"subtle smartphone sharpening",
"minor highlight compression",
"believable dynamic range"
],
"product_geometry_rule":"If a product is requested, place it in the free hand near chest level without blocking key facial features."
},
"realism_and_lighting":{
"core_goal":"The image must look like a real organic phone capture of a real person in a real moment in a real place.",
"lighting_rule":"Lighting must feel natural, candid, and organic. Never glamorize through lighting, but allow an attractive, healthy, clear, vibrant real world appearance without losing realism.",
"allowed":[
"soft window light",
"ordinary indoor light",
"mixed natural room light",
"everyday interior light"
]
},
"product_integration":{
"product_type":"hydration powder stick pack",
"placement_rule":"Product should sit in the free hand near chest level without blocking the face.",
"behavior":[
"product feels naturally included after a run",
"subject looks like he is about to mention it casually",
"no exaggerated ad pose"
]
},
"hard_negative_prompt":[
"mirror selfie",
"person taking a photo",
"photo of someone taking a photo",
"visible phone",
"phone in hand",
"phone covering face",
"mirror",
"reflection",
"third person shot",
"outside observer perspective",
"camera visible",
"photoshoot pose",
"influencer pose",
"model pose",
"airbrushed skin",
"plastic skin",
"beauty filter",
"polished portrait",
"DSLR look",
"cinematic environment",
"cartoon",
"anime",
"illustration",
"painting",
"text overlay",
"camera UI",
"extra fingers",
"warped hands",
"deformed face"
],
"final_instruction_block":{
"non_negotiable_rules":[
"Never glamorize.",
"Never generate a mirror selfie.",
"Never generate an outside observer shot of someone taking a selfie.",
"Never show the phone unless explicitly requested.",
"Always keep the image natural, organic, candid, conversational, and physically believable.",
"Always make the subject feel like they are about to talk.",
"Always keep the camera as direct front camera output.",
"Default every avatar to distinctly above average natural attractiveness while keeping them realistic and non glamorized.",
"Default every avatar to a very fit, healthy, lean toned physique while keeping the body believable."
]
}
}
