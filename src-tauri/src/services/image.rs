use anyhow::{Context, Result};
use image::{GenericImageView, imageops::FilterType};
use std::fs;
use std::path::Path;

pub struct ImageService;

impl ImageService {
    pub fn new() -> Self {
        Self
    }
    
    pub fn compress_image(&self, input_path: &Path, output_path: &Path, max_size: u32) -> Result<(i32, i32)> {
        let img = image::open(input_path).context("Failed to open image")?;
        
        let (width, height) = img.dimensions();
        let (new_width, new_height) = if width > height {
            let ratio = max_size as f32 / width as f32;
            (max_size, (height as f32 * ratio) as u32)
        } else {
            let ratio = max_size as f32 / height as f32;
            ((width as f32 * ratio) as u32, max_size)
        };
        
        let resized = img.resize(new_width, new_height, FilterType::Lanczos3);
        resized.save(output_path).context("Failed to save compressed image")?;
        
        Ok((new_width as i32, new_height as i32))
    }
    
    pub fn generate_thumbnail(&self, input_path: &Path, output_path: &Path, size: u32) -> Result<()> {
        let img = image::open(input_path).context("Failed to open image")?;
        let thumbnail = img.resize(size, size, FilterType::Lanczos3);
        thumbnail.save(output_path).context("Failed to save thumbnail")?;
        Ok(())
    }
    
    pub fn get_dimensions(&self, path: &Path) -> Result<(i32, i32)> {
        let img = image::open(path).context("Failed to open image")?;
        let (width, height) = img.dimensions();
        Ok((width as i32, height as i32))
    }
    
    pub fn image_to_base64(&self, path: &Path) -> Result<String> {
        let data = fs::read(path).context("Failed to read image file")?;
        Ok(base64_encode(&data))
    }
    
    pub fn save_from_bytes(&self, data: &[u8], output_path: &Path) -> Result<(i32, i32)> {
        fs::write(output_path, data).context("Failed to write image file")?;
        self.get_dimensions(output_path)
    }
    
    pub fn generate_image_id(&self) -> String {
        uuid::Uuid::new_v4().to_string()
    }
}

fn base64_encode(data: &[u8]) -> String {
    use base64::{Engine as _, engine::general_purpose};
    general_purpose::STANDARD.encode(data)
}
