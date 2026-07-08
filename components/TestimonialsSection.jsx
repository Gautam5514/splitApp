import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { BadgeCheck, Globe, MapPin, Quote, Star } from "lucide-react-native";
import { Dimensions, Image, ScrollView, StyleSheet, Text, View } from "react-native";

const { width } = Dimensions.get("window");

const TESTIMONIALS = [
  {
    id: 1,
    quote: "I never thought splitting money could be satisfying. The OCR receipt scanning is absolute magic.",
    author: "Sarah Jenkins",
    location: "Tokyo, Japan",
    role: "Backpacker",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
  },
  {
    id: 2,
    quote: "My colleagues and I use this for every business trip. It handles multi-currency better than Excel ever did.",
    author: "David Chen",
    location: "London, UK",
    role: "Business Traveler",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
  },
  {
    id: 3,
    quote: "The interface is gorgeous. Even my parents, who aren't tech-savvy, figured it out in minutes.",
    author: "Elena Rodriguez",
    location: "Rome, Italy",
    role: "Family Vacationer",
    avatar: "https://i.pravatar.cc/150?u=a04258114e29026302d",
  },
];

function TestimonialCard({ item, index, colors }) {
  return (
    <View style={[styles.cardWrapper, { marginLeft: index === 0 ? 24 : 0 }]}>
      <LinearGradient
        colors={["rgba(255, 255, 255, 0.12)", "rgba(255, 255, 255, 0.04)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* ✨ Decor: Giant Quote Mark */}
        <Quote size={100} color="white" style={styles.bgDecorIcon} />

        {/* 🏷️ Header: Rating & Verification */}
        <View style={styles.cardHeader}>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={14} color="#FBBF24" fill="#FBBF24" />
            ))}
          </View>
          <View style={styles.verifiedBadge}>
            <BadgeCheck size={12} color="#34D399" />
            <Text style={styles.verifiedText}>Verified Trip</Text>
          </View>
        </View>

        {/* 💬 The Review */}
        <Text style={styles.quoteText}>{"\"" + item.quote + "\""}</Text>

        {/* 👤 Author Section */}
        <View style={styles.authorSection}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{item.author}</Text>
            <View style={styles.locationRow}>
                <MapPin size={10} color="rgba(255,255,255,0.6)" />
                <Text style={styles.authorRole}>{item.location}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

export default function TestimonialsSection() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* 🌌 Background: Deep Universe Gradient */}
      <LinearGradient
        colors={["#0F172A", "#1E1B4B", "#020617"]} 
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      {/* 🌍 Background Pattern: Abstract Globe */}
      <View style={styles.bgPatternContainer}>
         <Globe size={width * 0.8} color="rgba(255,255,255,0.03)" style={styles.bgGlobe} />
         <View style={styles.bgGlow} />
      </View>

      {/* 🏆 Section Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>WALL OF LOVE</Text>
        <Text style={styles.heading}>
            <Text style={styles.headingDim}>Trusted by </Text>
            <Text style={styles.headingHighlight}>50,000+</Text>
            {"\n"}Travelers Worldwide
        </Text>
      </View>

      {/* 🃏 Cards Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={width * 0.85 + 20}
        decelerationRate="fast"
      >
        {TESTIMONIALS.map((item, index) => (
          <TestimonialCard key={item.id} item={item} index={index} colors={colors} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingVertical: 70,
    width: "100%",
    position: 'relative',
    overflow: 'hidden',
  },
  
  // 🌍 Background Elements
  bgPatternContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  bgGlobe: {
    transform: [{ rotate: '-15deg' }, { translateX: width * 0.2 }],
  },
  bgGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(99, 102, 241, 0.15)', // Indigo Glow
    filter: 'blur(50px)', // Works on some versions, otherwise opacity handles it
  },

  // 🏆 Header
  header: {
    paddingHorizontal: 24,
    marginBottom: 40,
    zIndex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#818CF8', // Indigo 400
    letterSpacing: 2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 34,
    fontWeight: "900", // Heavy
    color: "white",
    letterSpacing: -1,
    lineHeight: 40,
  },
  headingDim: {
    color: "rgba(255,255,255,0.6)",
  },
  headingHighlight: {
    color: "#FFFFFF",
    textDecorationLine: 'underline',
    textDecorationColor: '#4F46E5',
  },

  // 🃏 Cards
  scrollContent: {
    paddingRight: 24,
    paddingBottom: 20, // Space for shadow
  },
  cardWrapper: {
    width: width * 0.85,
    marginRight: 20,
    shadowColor: "#4F46E5", // Colored shadow
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  cardGradient: {
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    minHeight: 240,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  bgDecorIcon: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    opacity: 0.05,
    transform: [{ rotate: '-10deg' }],
  },

  // Card Content
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 211, 153, 0.1)', // Emerald Tint
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  verifiedText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  quoteText: {
    fontSize: 18,
    color: "rgba(255,255,255,0.95)",
    lineHeight: 28,
    fontWeight: "500",
    marginBottom: 24,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 20,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'white',
  },
  authorInfo: {
    justifyContent: 'center',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorRole: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
});