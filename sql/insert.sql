INSERT INTO events (id, name, slug, description) VALUES (1, 'Forritarahittingur í febrúar', 'forritarahittingur-i-februar', 'Forritarar hittast í febrúar og forrita saman eitthvað frábært.');
INSERT INTO events (id, name, slug, description) VALUES (2, 'Hönnuðahittingur í mars', 'honnudahittingur-i-mars', 'Spennandi hittingur hönnuða í Hönnunarmars.');
INSERT INTO events (id, name, slug, description) VALUES (3, 'Verkefnastjórahittingur í apríl', 'verkefnastjorahittingur-i-april', 'Virkilega vel verkefnastýrður hittingur.');

INSERT INTO registrations (name, comment, event) VALUES ('Forvitinn forritari', 'Hlakka til að forrita með ykkur', 1);
INSERT INTO registrations (name, comment, event) VALUES ('Jón Jónsson', null, 1);
INSERT INTO registrations (name, comment, event) VALUES ('Guðrún Guðrúnar', 'verður vefforritað?', 1);

INSERT INTO users (admin, username, password) VALUES (1, 'admin', '$2a$11$pgj3.zySyFOvIQEpD7W6Aund1Tw.BFarXxgLJxLbrzIv/4Nteisii');
