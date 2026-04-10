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
        log::info!("Opening image at {:?}", path);
        
        // 检查文件是否存在
        if !path.exists() {
            return Err(anyhow::anyhow!("Image file does not exist: {:?}", path));
        }
        
        // 检查文件大小
        let metadata = fs::metadata(path)
            .with_context(|| format!("Failed to read metadata for {:?}", path))?;
        log::info!("File size: {} bytes", metadata.len());
        
        // 尝试打开图片
        let img = image::open(path)
            .with_context(|| format!("Failed to open image at {:?} - file may be corrupted or in unsupported format", path))?;
        
        let (width, height) = img.dimensions();
        log::info!("Image dimensions: {}x{}", width, height);
        
        Ok((width as i32, height as i32))
    }
    
    pub fn image_to_base64(&self, path: &Path) -> Result<String> {
        let data = fs::read(path).context("Failed to read image file")?;
        Ok(base64_encode(&data))
    }
    
    pub fn save_from_bytes(&self, data: &[u8], output_path: &Path) -> Result<(i32, i32)> {
        log::info!("Writing {} bytes to {:?}", data.len(), output_path);
        
        // 记录文件头（前4个字节）用于调试
        let header: Vec<String> = data.iter().take(4).map(|b| format!("{:02x}", b)).collect();
        log::info!("File header (first 4 bytes): {}", header.join(" "));
        
        // 写入文件
        fs::write(output_path, data)
            .with_context(|| format!("Failed to write image file to {:?}", output_path))?;
        
        log::info!("File written, getting dimensions...");
        
        // 获取图片尺寸
        match self.get_dimensions(output_path) {
            Ok(dim) => {
                log::info!("Got dimensions: {}x{}", dim.0, dim.1);
                Ok(dim)
            }
            Err(e) => {
                log::error!("Failed to get dimensions for {:?}: {:?}", output_path, e);
                // 尝试删除损坏的文件
                let _ = fs::remove_file(output_path);
                Err(e)
            }
        }
    }
    
    pub fn generate_image_id(&self) -> String {
        uuid::Uuid::new_v4().to_string()
    }
}

fn base64_encode(data: &[u8]) -> String {
    use base64::{Engine as _, engine::general_purpose};
    general_purpose::STANDARD.encode(data)
}
