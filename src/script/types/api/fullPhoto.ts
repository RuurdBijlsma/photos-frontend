export interface Location {
  name: string | null
  admin1: string | null
  admin2: string | null
  country_code: string
  country_name: string
}

export interface OcrBox {
  text: string
  position_x: number
  position_y: number
  width: number
  height: number
  confidence: number
}

export interface Face {
  position_x: number
  position_y: number
  width: number
  height: number
  confidence: number
  age: number
  sex: string
  mouth_left_x: number
  mouth_left_y: number
  mouth_right_x: number
  mouth_right_y: number
  nose_tip_x: number
  nose_tip_y: number
  eye_left_x: number
  eye_left_y: number
  eye_right_x: number
  eye_right_y: number
}

export interface DetectedObject {
  position_x: number
  position_y: number
  width: number
  height: number
  confidence: number
  label: string
}

export interface QualityData {
  blurriness: number
  noisiness: number
  exposure: number
  quality_score: number
}

export interface ColorData {
  themes: any[]
  prominent_colors: string[] | null
  average_hue: number
  average_saturation: number
  average_lightness: number
  histogram: any | null
}

export interface CaptionData {
  default_caption: string | null
  main_subject: string | null
  contains_pets: boolean
  contains_vehicle: boolean
  contains_landmarks: boolean
  contains_people: boolean
  contains_animals: boolean
  is_indoor: boolean
  is_food_or_drink: boolean
  is_event: boolean
  is_document: boolean
  is_landscape: boolean
  is_cityscape: boolean
  is_activity: boolean
  setting: string | null
  pet_type: string | null
  animal_type: string | null
  food_or_drink_type: string | null
  vehicle_type: string | null
  event_type: string | null
  landmark_name: string | null
  document_type: string | null
  people_count: number | null
  people_mood: string | null
  photo_type: string | null
  activity_description: string | null
}

export interface TimeDetails {
  timezone_name: string | null
  timezone_offset_seconds: number | null
  source: string | null
  source_details: string | null
  source_confidence: string | null
}

export interface Weather {
  temperature: number | null
  dew_point: number | null
  relative_humidity: number | null
  precipitation: number | null
  snow: number | null
  wind_direction: number | null
  wind_speed: number | null
  peak_wind_gust: number | null
  pressure: number | null
  sunshine_minutes: number | null
  condition: string | null
  sunrise: string | null
  sunset: string | null
  dawn: string | null
  dusk: string | null
  is_daytime: boolean | null
}

export interface Details {
  mime_type: string
  size_bytes: number
  is_motion_photo: boolean
  motion_photo_presentation_timestamp: number | null
  is_hdr: boolean
  is_burst: boolean
  burst_id: string | null
  capture_fps: number | null
  video_fps: number | null
  is_nightsight: boolean
  is_timelapse: boolean
  exif: any | null
}

export interface CaptureDetails {
  iso: number | null
  exposure_time: number | null
  aperture: number | null
  focal_length: number | null
  camera_make: string | null
  camera_model: string | null
}

export interface Panorama {
  is_photosphere: boolean
  projection_type: string | null
  horizontal_fov_deg: number | null
  vertical_fov_deg: number | null
  center_yaw_deg: number | null
  center_pitch_deg: number | null
}

export interface OcrData {
  has_legible_text: boolean
  ocr_text: string | null
  boxes: OcrBox[]
}

export interface VisualAnalysis {
  created_at: string
  ocr_data: OcrData[]
  faces: Face[]
  detected_objects: DetectedObject[]
  quality: QualityData | null
  colors: ColorData | null
  caption: CaptionData | null
}

export interface Gps {
  latitude: number
  longitude: number
  altitude: number | null
  image_direction: number | null
  location: Location | null
}

export interface FullMediaItem {
  id: string
  hash: string
  relative_path: string
  created_at: string
  updated_at: string
  width: number
  height: number
  is_video: boolean
  duration_ms: number | null
  taken_at_local: string
  taken_at_utc: string | null
  use_panorama_viewer: boolean
  visual_analyses: VisualAnalysis[]
  gps: Gps | null
  time_details: TimeDetails | null
  weather: Weather | null
  details: Details | null
  capture_details: CaptureDetails | null
  panorama: Panorama | null
}
