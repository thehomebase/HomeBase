import { Router } from "express";
import passport from "passport";
import { Strategy as TwitterStrategy } from "passport-twitter";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { storage } from "../storage";

const router = Router();

// Initialize strategies
if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
  passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: "/api/social/auth/twitter/callback",
    includeEmail: true
  }, async (token, tokenSecret, profile, done) => {
    try {
      // Store the tokens and profile info in the database
      await storage.updateSocialAccount({
        userId: done.id,
        platform: 'twitter',
        token,
        tokenSecret,
        profileId: profile.id,
        username: profile.username
      });
      return done(null, profile);
    } catch (error) {
      return done(error as Error);
    }
  }));
}

if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/api/social/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      await storage.updateSocialAccount({
        userId: done.id,
        platform: 'facebook',
        token: accessToken,
        refreshToken,
        profileId: profile.id,
        username: profile.displayName
      });
      return done(null, profile);
    } catch (error) {
      return done(error as Error);
    }
  }));
}

if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: "/api/social/auth/linkedin/callback",
    scope: ['r_emailaddress', 'r_liteprofile', 'w_member_social']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      await storage.updateSocialAccount({
        userId: done.id,
        platform: 'linkedin',
        token: accessToken,
        refreshToken,
        profileId: profile.id,
        username: profile.displayName
      });
      return done(null, profile);
    } catch (error) {
      return done(error as Error);
    }
  }));
}

// Auth routes for each platform
router.get('/connect/twitter', passport.authenticate('twitter'));
router.get('/connect/facebook', passport.authenticate('facebook'));
router.get('/connect/linkedin', passport.authenticate('linkedin'));

// Callback routes
router.get('/auth/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/social-media' }),
  (req, res) => res.redirect('/social-media')
);

router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/social-media' }),
  (req, res) => res.redirect('/social-media')
);

router.get('/auth/linkedin/callback',
  passport.authenticate('linkedin', { failureRedirect: '/social-media' }),
  (req, res) => res.redirect('/social-media')
);

// Get connected accounts
router.get('/accounts', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const accounts = await storage.getSocialAccounts(req.user.id);
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch social accounts' });
  }
});

// Create and schedule a social media post
router.post('/posts', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const { content, platforms } = req.body;
    const post = await storage.createSocialPost({
      userId: req.user.id,
      content,
      platforms,
      status: 'draft'
    });
    
    // Schedule the post for publishing (implement actual social media API calls here)
    for (const platform of platforms) {
      try {
        const account = await storage.getSocialAccountByPlatform(req.user.id, platform);
        if (!account) continue;
        
        // Implement actual posting logic for each platform
        // This is where you'd make API calls to each social media platform
        await publishToSocialMedia(platform, content, account);
      } catch (error) {
        console.error(`Failed to post to ${platform}:`, error);
      }
    }
    
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get user's posts
router.get('/posts', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const posts = await storage.getSocialPosts(req.user.id);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

async function publishToSocialMedia(platform: string, content: string, account: any) {
  // Implement the actual posting logic for each platform
  // This would involve making API calls to the respective social media platforms
  // You'd use the stored tokens to authenticate these requests
  switch (platform) {
    case 'twitter':
      // Implement Twitter posting
      break;
    case 'facebook':
      // Implement Facebook posting
      break;
    case 'linkedin':
      // Implement LinkedIn posting
      break;
  }
}

export default router;
