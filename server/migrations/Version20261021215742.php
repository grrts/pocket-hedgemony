<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Platforms\PostgreSQLPlatform;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Crash reports (`POST /api/crashes`, settings SET-140) and the indexes the Stats page and the
 * purge read metric events by (SET-141).
 */
final class Version20261021215742 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Crash reports, and metric event indexes for the Stats page and the purge';
    }

    public function up(Schema $schema): void
    {
        $this->abortIf(!$this->connection->getDatabasePlatform() instanceof PostgreSQLPlatform, 'Migrations are written for PostgreSQL; a local SQLite database uses doctrine:schema:update (docs/deploy.md).');
        $this->addSql('CREATE TABLE crash_report (id UUID NOT NULL, install_id VARCHAR(64) NOT NULL, runtime VARCHAR(32) NOT NULL, version VARCHAR(32) NOT NULL, kind VARCHAR(16) NOT NULL, message TEXT NOT NULL, stack TEXT DEFAULT NULL, location VARCHAR(64) DEFAULT NULL, browser VARCHAR(64) DEFAULT NULL, fingerprint VARCHAR(40) NOT NULL, occurred_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, received_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_crash_fingerprint_time ON crash_report (fingerprint, occurred_at)');
        $this->addSql('CREATE INDEX idx_crash_received ON crash_report (received_at)');
        $this->addSql('CREATE INDEX idx_metric_time ON metric_event (occurred_at)');
        $this->addSql('CREATE INDEX idx_metric_received ON metric_event (received_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE crash_report');
        $this->addSql('DROP INDEX idx_metric_time');
        $this->addSql('DROP INDEX idx_metric_received');
    }
}
