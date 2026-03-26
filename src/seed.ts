import mongoose from "mongoose";
import dotenv from "dotenv";
import { User, HostProfile, Property, Testimonial, Booking, Review } from "./models/index";
import { hashPassword } from "./utils/auth";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/raibaar";

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await HostProfile.deleteMany({});
    await Property.deleteMany({});
    await Testimonial.deleteMany({});
    await Booking.deleteMany({});
    await Review.deleteMany({});
    console.log("Cleared existing data");

    // Create admin user
    const adminPassword = await hashPassword("admin123456");
    const adminUser = await User.create({
      email: "admin@raibaar.com",
      password: adminPassword,
      firstName: "Admin",
      lastName: "Raibaar",
      role: "admin",
      isVerified: true,
    });
    console.log("✓ Created admin user (admin@raibaar.com / admin123456)");

    // Create hosts
    const hostsData = [
      { email: "ratan@raibaar.com", password: "password123", firstName: "Ratan", lastName: "Singh Bisht" },
      { email: "kamla@raibaar.com", password: "password123", firstName: "Kamla", lastName: "Devi" },
      { email: "mohan@raibaar.com", password: "password123", firstName: "Mohan", lastName: "Joshi" },
      { email: "geeta@raibaar.com", password: "password123", firstName: "Geeta", lastName: "Rawat" },
      { email: "prakash@raibaar.com", password: "password123", firstName: "Prakash", lastName: "Negi" },
    ];

    const hosts = [];
    for (const hostData of hostsData) {
      const hashedPassword = await hashPassword(hostData.password);
      const user = await User.create({
        ...hostData,
        password: hashedPassword,
        role: "host",
        isVerified: true,
      });

      const hostProfile = await HostProfile.create({
        userId: user._id,
        bio:
          hostData.firstName === "Ratan"
            ? "Born and raised in Munsiyari. I love sharing our Kumaoni traditions with travelers."
            : hostData.firstName === "Kamla"
              ? "Our family has lived in this village for 7 generations. Welcome to our home."
              : hostData.firstName === "Mohan"
                ? "A retired teacher who returned to my village to host travelers and preserve our culture."
                : hostData.firstName === "Geeta"
                  ? "I grow organic food and cook traditional Garhwali meals for my guests."
                  : "Former city worker who returned to build a sustainable life in our ancestral village.",
        village:
          hostData.firstName === "Ratan"
            ? "Munsiyari"
            : hostData.firstName === "Kamla"
              ? "Binsar"
              : hostData.firstName === "Mohan"
                ? "Chopta"
                : hostData.firstName === "Geeta"
                  ? "Kanatal"
                  : "Chakrata",
        verified: true,
        yearsHosting: Math.floor(Math.random() * 5) + 2,
      });

      hosts.push(hostProfile);
    }

    console.log("✓ Created host profiles");

    // Create properties
    const propertiesData = [
      {
        title: "Stone Cottage with Himalayan Views",
        description:
          "A traditional Kumaoni stone house with stunning views of Panchachuli peaks. Wake up to birdsong, enjoy home-cooked meals, and trek through rhododendron forests.",
        village: "Munsiyari",
        district: "Pithoragarh",
        state: "Uttarakhand",
        price: 1800,
        maxGuests: 4,
        rating: 4.9,
        reviewCount: 47,
        images: [
          "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800",
          "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800",
        ],
        amenities: ["Mountain View", "Home-cooked Meals", "Hot Water", "Bonfire", "Trekking Guide", "WiFi"],
        houseRules: ["No smoking indoors", "Respect local customs", "Quiet hours after 10 PM"],
        villageExperience: "Join local farmers for morning chai, walk through terraced fields, and learn traditional Kumaoni weaving.",
        hostId: hosts[0]._id,
        featured: true,
      },
      {
        title: "Oak Forest Retreat",
        description: "Nestled in a dense oak and deodar forest near Binsar Wildlife Sanctuary. Perfect for birdwatching and finding inner peace.",
        village: "Binsar",
        district: "Almora",
        state: "Uttarakhand",
        price: 2200,
        maxGuests: 3,
        rating: 4.8,
        reviewCount: 32,
        images: ["https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800"],
        amenities: ["Forest View", "Organic Food", "Library", "Bird Watching", "Hot Water"],
        houseRules: ["No loud music", "No plastic", "Leave no trace"],
        villageExperience: "Explore 200+ bird species, visit the ancient Binsar temple.",
        hostId: hosts[1]._id,
        featured: true,
      },
      {
        title: "Meadow-side Wooden Hut",
        description: "A charming wooden hut overlooking the Tungnath meadows. The closest accommodation to the world's highest Shiva temple.",
        village: "Chopta",
        district: "Rudraprayag",
        state: "Uttarakhand",
        price: 1500,
        maxGuests: 2,
        rating: 4.7,
        reviewCount: 58,
        images: ["https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800"],
        amenities: ["Meadow View", "Campfire", "Packed Lunch", "Trekking Guide"],
        houseRules: ["No littering", "Carry your own water bottle"],
        villageExperience: "Trek to Tungnath and Chandrashila peak, gather wild herbs with locals.",
        hostId: hosts[2]._id,
        featured: true,
      },
      {
        title: "Apple Orchard Homestay",
        description: "A cozy home surrounded by apple orchards with views of snow-capped Himalayas. Perfect for families.",
        village: "Kanatal",
        district: "Tehri Garhwal",
        state: "Uttarakhand",
        price: 2500,
        maxGuests: 6,
        rating: 4.9,
        reviewCount: 41,
        images: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"],
        amenities: ["Orchard Garden", "Family Rooms", "Garhwali Cuisine", "WiFi"],
        houseRules: ["Children welcome", "No smoking"],
        villageExperience: "Pick fresh apples in season, cook traditional Garhwali dishes.",
        hostId: hosts[3]._id,
        featured: true,
      },
      {
        title: "Tiger Falls Forest Home",
        description: "A peaceful forest home near the majestic Tiger Falls. Ideal for nature lovers.",
        village: "Chakrata",
        district: "Dehradun",
        state: "Uttarakhand",
        price: 1600,
        maxGuests: 4,
        rating: 4.6,
        reviewCount: 29,
        images: ["https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800"],
        amenities: ["Waterfall Nearby", "Forest Trails", "Organic Meals", "Bonfire"],
        houseRules: ["Eco-friendly stays only", "No single-use plastic"],
        villageExperience: "Visit Tiger Falls, explore Deoban forests.",
        hostId: hosts[4]._id,
        featured: true,
      },
    ];

    await Property.insertMany(propertiesData);
    console.log("✓ Created properties");

    // Create testimonials
    const testimonialData = [
      {
        name: "Meera Krishnan",
        location: "Bengaluru",
        quote:
          "Raibaar gave me an experience no luxury hotel ever could. Living with a local family, eating home-cooked meals changed my perspective on travel forever.",
        rating: 5,
        approved: true,
      },
      {
        name: "James Chen",
        location: "Singapore",
        quote: "I came for a weekend and stayed a week. The village life is addictive in its simplicity.",
        rating: 5,
        approved: true,
      },
      {
        name: "Anjali Deshmukh",
        location: "Mumbai",
        quote: "My children learned more in 3 days at a village homestay than in months of school.",
        rating: 5,
        approved: true,
      },
    ];

    await Testimonial.insertMany(testimonialData);
    console.log("✓ Created testimonials");

    console.log("\n✓ Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("✗ Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
